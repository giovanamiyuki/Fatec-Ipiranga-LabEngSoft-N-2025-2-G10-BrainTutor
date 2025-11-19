const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const Stripe = require('stripe');

// Inicializar Stripe (chave será carregada do .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================================
// PAYMENTS ROUTES - Processamento de Pagamentos com Stripe
// ============================================================

// POST /api/payments/create-intent - Criar PaymentIntent no Stripe
router.post('/create-intent', authMiddleware, async (req, res) => {
    try {
        const { lesson_id } = req.body;
        const userId = req.userId;

        if (!lesson_id) {
            return res.status(400).json({
                success: false,
                message: 'lesson_id é obrigatório'
            });
        }

        // Buscar detalhes da aula
        const [lessons] = await db.query(
            `SELECT 
                l.*,
                t_user.name as teacher_name,
                t_user.email as teacher_email,
                s_user.name as student_name,
                s_user.email as student_email
             FROM lessons l
             INNER JOIN users t_user ON l.teacher_id = t_user.id
             INNER JOIN users s_user ON l.student_id = s_user.id
             WHERE l.id = ?`,
            [lesson_id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula não encontrada'
            });
        }

        const lesson = lessons[0];

        // Verificar se o usuário é o aluno desta aula
        if (lesson.student_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para pagar esta aula'
            });
        }

        // Verificar se já existe um pagamento pendente ou bem-sucedido
        const [existingPayments] = await db.query(
            'SELECT * FROM payments WHERE lesson_id = ? AND status IN ("pending", "processing", "succeeded")',
            [lesson_id]
        );

        if (existingPayments.length > 0) {
            const payment = existingPayments[0];
            
            if (payment.status === 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'Esta aula já foi paga'
                });
            }

            // Se já existe um PaymentIntent pendente, retornar o client_secret existente
            return res.json({
                success: true,
                message: 'PaymentIntent existente recuperado',
                data: {
                    clientSecret: payment.stripe_client_secret,
                    paymentId: payment.id,
                    lesson: lesson
                }
            });
        }

        // Converter preço para centavos (Stripe usa centavos)
        const amount = Math.round(lesson.price * 100);

        // Criar PaymentIntent no Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'brl',
            description: `Aula de ${lesson.subject} - ${lesson.teacher_name}`,
            metadata: {
                lesson_id: lesson_id,
                student_id: lesson.student_id,
                teacher_id: lesson.teacher_id,
                student_name: lesson.student_name,
                teacher_name: lesson.teacher_name,
                subject: lesson.subject
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Salvar pagamento no banco de dados
        const [result] = await db.query(
            `INSERT INTO payments 
             (lesson_id, stripe_payment_intent_id, stripe_client_secret, amount, currency, status, metadata)
             VALUES (?, ?, ?, ?, 'brl', 'pending', ?)`,
            [
                lesson_id,
                paymentIntent.id,
                paymentIntent.client_secret,
                lesson.price,
                JSON.stringify({
                    lesson_id,
                    student_name: lesson.student_name,
                    teacher_name: lesson.teacher_name,
                    subject: lesson.subject
                })
            ]
        );

        res.json({
            success: true,
            message: 'PaymentIntent criado com sucesso',
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentId: result.insertId,
                lesson: lesson
            }
        });

    } catch (error) {
        console.error('Erro ao criar PaymentIntent:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar intenção de pagamento',
            error: error.message
        });
    }
});

// POST /api/payments/webhook - Receber eventos do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verificar assinatura do webhook
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Erro na verificação do webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Salvar evento no banco (log)
    try {
        await db.query(
            `INSERT INTO payment_webhooks (event_id, event_type, payment_intent_id, payload, processed)
             VALUES (?, ?, ?, ?, FALSE)`,
            [
                event.id,
                event.type,
                event.data.object.id,
                JSON.stringify(event)
            ]
        );
    } catch (error) {
        console.error('Erro ao salvar webhook:', error);
    }

    // Processar evento
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;

            case 'payment_intent.canceled':
                await handlePaymentCanceled(event.data.object);
                break;

            case 'charge.refunded':
                await handleRefund(event.data.object);
                break;

            default:
                console.log(`Evento não processado: ${event.type}`);
        }

        // Marcar webhook como processado
        await db.query(
            'UPDATE payment_webhooks SET processed = TRUE, processed_at = NOW() WHERE event_id = ?',
            [event.id]
        );

    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        
        // Registrar erro
        await db.query(
            'UPDATE payment_webhooks SET processing_error = ? WHERE event_id = ?',
            [error.message, event.id]
        );
    }

    res.json({ received: true });
});

// GET /api/payments/lesson/:lessonId - Buscar pagamento de uma aula
router.get('/lesson/:lessonId', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.userId;

        // Verificar se o usuário tem acesso à aula
        const [lessons] = await db.query(
            'SELECT * FROM lessons WHERE id = ?',
            [lessonId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula não encontrada'
            });
        }

        const lesson = lessons[0];

        if (lesson.student_id !== userId && lesson.teacher_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar este pagamento'
            });
        }

        // Buscar pagamento
        const [payments] = await db.query(
            'SELECT * FROM payments WHERE lesson_id = ? ORDER BY created_at DESC LIMIT 1',
            [lessonId]
        );

        if (payments.length === 0) {
            return res.json({
                success: true,
                data: {
                    payment: null,
                    message: 'Nenhum pagamento encontrado para esta aula'
                }
            });
        }

        res.json({
            success: true,
            data: {
                payment: payments[0]
            }
        });

    } catch (error) {
        console.error('Erro ao buscar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pagamento',
            error: error.message
        });
    }
});

// POST /api/payments/:id/refund - Solicitar reembolso
router.post('/:id/refund', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.userId;

        // Buscar pagamento
        const [payments] = await db.query(
            `SELECT p.*, l.student_id, l.teacher_id 
             FROM payments p
             INNER JOIN lessons l ON p.lesson_id = l.id
             WHERE p.id = ?`,
            [id]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pagamento não encontrado'
            });
        }

        const payment = payments[0];

        // Verificar permissão (apenas aluno pode solicitar reembolso)
        if (payment.student_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para solicitar reembolso'
            });
        }

        // Verificar se o pagamento foi bem-sucedido
        if (payment.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: 'Apenas pagamentos bem-sucedidos podem ser reembolsados'
            });
        }

        // Criar reembolso no Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            reason: 'requested_by_customer',
            metadata: {
                reason: reason || 'Reembolso solicitado pelo aluno'
            }
        });

        // Atualizar pagamento no banco
        await db.query(
            `UPDATE payments 
             SET status = 'refunded', 
                 refund_amount = ?, 
                 refund_reason = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [payment.amount, reason || 'Reembolso solicitado', id]
        );

        // Atualizar status da aula
        await db.query(
            'UPDATE lessons SET status = "cancelled", updated_at = NOW() WHERE id = ?',
            [payment.lesson_id]
        );

        res.json({
            success: true,
            message: 'Reembolso processado com sucesso',
            data: {
                refund: {
                    id: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status
                }
            }
        });

    } catch (error) {
        console.error('Erro ao processar reembolso:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar reembolso',
            error: error.message
        });
    }
});

// ============================================================
// FUNÇÕES AUXILIARES - Processamento de Webhooks
// ============================================================

async function handlePaymentSuccess(paymentIntent) {
    try {
        console.log('✅ Pagamento bem-sucedido:', paymentIntent.id);

        // Atualizar pagamento no banco
        await db.query(
            `UPDATE payments 
             SET status = 'succeeded', 
                 payment_method = ?,
                 payment_method_details = ?,
                 updated_at = NOW()
             WHERE stripe_payment_intent_id = ?`,
            [
                paymentIntent.payment_method,
                JSON.stringify(paymentIntent.charges.data[0]),
                paymentIntent.id
            ]
        );

        // Buscar lesson_id do pagamento
        const [payments] = await db.query(
            'SELECT lesson_id FROM payments WHERE stripe_payment_intent_id = ?',
            [paymentIntent.id]
        );

        if (payments.length > 0) {
            const lessonId = payments[0].lesson_id;

            // Atualizar status da aula para confirmado
            await db.query(
                'UPDATE lessons SET status = "confirmed", updated_at = NOW() WHERE id = ?',
                [lessonId]
            );

            console.log(`✅ Aula ${lessonId} confirmada após pagamento`);
        }

    } catch (error) {
        console.error('Erro ao processar pagamento bem-sucedido:', error);
        throw error;
    }
}

async function handlePaymentFailure(paymentIntent) {
    try {
        console.log('❌ Falha no pagamento:', paymentIntent.id);

        await db.query(
            `UPDATE payments 
             SET status = 'failed',
                 failure_reason = ?,
                 updated_at = NOW()
             WHERE stripe_payment_intent_id = ?`,
            [
                paymentIntent.last_payment_error?.message || 'Falha no pagamento',
                paymentIntent.id
            ]
        );

    } catch (error) {
        console.error('Erro ao processar falha de pagamento:', error);
        throw error;
    }
}

async function handlePaymentCanceled(paymentIntent) {
    try {
        console.log('🚫 Pagamento cancelado:', paymentIntent.id);

        await db.query(
            `UPDATE payments 
             SET status = 'cancelled',
                 updated_at = NOW()
             WHERE stripe_payment_intent_id = ?`,
            [paymentIntent.id]
        );

    } catch (error) {
        console.error('Erro ao processar cancelamento:', error);
        throw error;
    }
}

async function handleRefund(charge) {
    try {
        console.log('💰 Reembolso processado:', charge.id);

        // Buscar pagamento pelo payment_intent
        const [payments] = await db.query(
            'SELECT * FROM payments WHERE stripe_payment_intent_id = ?',
            [charge.payment_intent]
        );

        if (payments.length > 0) {
            const payment = payments[0];
            const refundAmount = charge.amount_refunded / 100;

            await db.query(
                `UPDATE payments 
                 SET status = 'refunded',
                     refund_amount = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [refundAmount, payment.id]
            );

            // Cancelar aula
            await db.query(
                'UPDATE lessons SET status = "cancelled", updated_at = NOW() WHERE id = ?',
                [payment.lesson_id]
            );
        }

    } catch (error) {
        console.error('Erro ao processar reembolso:', error);
        throw error;
    }
}

module.exports = router;
