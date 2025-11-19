const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

// ============================================================
// LESSONS ROUTES - Gerenciamento de Aulas
// ============================================================

// POST /api/lessons - Criar novo agendamento de aula
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            teacher_id,
            subject,
            description,
            scheduled_date,
            duration_minutes,
            price,
            notes
        } = req.body;

        const student_id = req.userId;

        // Validações
        if (!teacher_id || !subject || !scheduled_date || !price) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: teacher_id, subject, scheduled_date, price'
            });
        }

        // Verificar se o professor existe
        const [teachers] = await db.query(
            'SELECT u.id, u.name, t.hourly_rate FROM users u INNER JOIN teachers t ON u.id = t.user_id WHERE u.id = ? AND u.role = "teacher"',
            [teacher_id]
        );

        if (teachers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Professor não encontrado'
            });
        }

        const teacher = teachers[0];

        // Verificar se o horário está disponível (não permitir agendamentos simultâneos)
        const scheduledDateTime = new Date(scheduled_date);
        const endDateTime = new Date(scheduledDateTime.getTime() + (duration_minutes || 50) * 60000);

        const [conflicts] = await db.query(
            `SELECT id FROM lessons 
             WHERE teacher_id = ? 
             AND status NOT IN ('cancelled', 'completed')
             AND (
                 (scheduled_date <= ? AND DATE_ADD(scheduled_date, INTERVAL duration_minutes MINUTE) > ?) OR
                 (scheduled_date < ? AND DATE_ADD(scheduled_date, INTERVAL duration_minutes MINUTE) >= ?)
             )`,
            [teacher_id, scheduledDateTime, scheduledDateTime, endDateTime, endDateTime]
        );

        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Este horário não está disponível. Por favor, escolha outro.'
            });
        }

        // Criar agendamento
        const [result] = await db.query(
            `INSERT INTO lessons 
             (student_id, teacher_id, subject, description, scheduled_date, duration_minutes, price, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                student_id,
                teacher_id,
                subject,
                description || null,
                scheduled_date,
                duration_minutes || 50,
                price,
                notes || null
            ]
        );

        const lessonId = result.insertId;

        // Buscar aula criada com informações do professor
        const [lessons] = await db.query(
            `SELECT 
                l.*,
                u.name as teacher_name,
                u.email as teacher_email,
                t.hourly_rate,
                t.bio as teacher_bio
             FROM lessons l
             INNER JOIN users u ON l.teacher_id = u.id
             INNER JOIN teachers t ON u.id = t.user_id
             WHERE l.id = ?`,
            [lessonId]
        );

        res.status(201).json({
            success: true,
            message: 'Aula agendada com sucesso!',
            data: {
                lesson: lessons[0]
            }
        });

    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar agendamento',
            error: error.message
        });
    }
});

// GET /api/lessons/:id - Buscar detalhes de uma aula específica
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [lessons] = await db.query(
            `SELECT 
                l.*,
                t_user.name as teacher_name,
                t_user.email as teacher_email,
                t_user.phone as teacher_phone,
                teacher.hourly_rate,
                teacher.bio as teacher_bio,
                s_user.name as student_name,
                s_user.email as student_email,
                s_user.phone as student_phone
             FROM lessons l
             INNER JOIN users t_user ON l.teacher_id = t_user.id
             INNER JOIN teachers teacher ON t_user.id = teacher.user_id
             INNER JOIN users s_user ON l.student_id = s_user.id
             WHERE l.id = ?`,
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula não encontrada'
            });
        }

        const lesson = lessons[0];

        // Verificar se o usuário tem permissão para ver esta aula
        if (lesson.student_id !== userId && lesson.teacher_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar esta aula'
            });
        }

        res.json({
            success: true,
            data: {
                lesson
            }
        });

    } catch (error) {
        console.error('Erro ao buscar aula:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar aula',
            error: error.message
        });
    }
});

// GET /api/lessons - Listar aulas do usuário
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { status, role } = req.query; // role: 'student' ou 'teacher'

        let query = `
            SELECT 
                l.*,
                t_user.name as teacher_name,
                t_user.email as teacher_email,
                s_user.name as student_name,
                s_user.email as student_email,
                p.status as payment_status
            FROM lessons l
            INNER JOIN users t_user ON l.teacher_id = t_user.id
            INNER JOIN users s_user ON l.student_id = s_user.id
            LEFT JOIN payments p ON l.id = p.lesson_id
            WHERE 1=1
        `;

        const params = [];

        // Filtrar por papel (aluno ou professor)
        if (role === 'student') {
            query += ' AND l.student_id = ?';
            params.push(userId);
        } else if (role === 'teacher') {
            query += ' AND l.teacher_id = ?';
            params.push(userId);
        } else {
            // Mostrar todas as aulas onde o usuário é aluno ou professor
            query += ' AND (l.student_id = ? OR l.teacher_id = ?)';
            params.push(userId, userId);
        }

        // Filtrar por status
        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }

        query += ' ORDER BY l.scheduled_date DESC';

        const [lessons] = await db.query(query, params);

        res.json({
            success: true,
            data: {
                lessons,
                count: lessons.length
            }
        });

    } catch (error) {
        console.error('Erro ao listar aulas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar aulas',
            error: error.message
        });
    }
});

// PATCH /api/lessons/:id/status - Atualizar status da aula
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, meeting_link } = req.body;
        const userId = req.userId;

        // Validar status
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }

        // Verificar se a aula existe e se o usuário tem permissão
        const [lessons] = await db.query(
            'SELECT * FROM lessons WHERE id = ?',
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula não encontrada'
            });
        }

        const lesson = lessons[0];

        // Apenas professor ou aluno podem atualizar
        if (lesson.student_id !== userId && lesson.teacher_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para atualizar esta aula'
            });
        }

        // Atualizar status
        const updateFields = ['status = ?'];
        const updateParams = [status];

        if (meeting_link) {
            updateFields.push('meeting_link = ?');
            updateParams.push(meeting_link);
        }

        updateParams.push(id);

        await db.query(
            `UPDATE lessons SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            updateParams
        );

        // Buscar aula atualizada
        const [updatedLesson] = await db.query(
            `SELECT 
                l.*,
                t_user.name as teacher_name,
                s_user.name as student_name
             FROM lessons l
             INNER JOIN users t_user ON l.teacher_id = t_user.id
             INNER JOIN users s_user ON l.student_id = s_user.id
             WHERE l.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Status da aula atualizado com sucesso',
            data: {
                lesson: updatedLesson[0]
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status da aula',
            error: error.message
        });
    }
});

// DELETE /api/lessons/:id - Cancelar aula
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Verificar se a aula existe
        const [lessons] = await db.query(
            'SELECT * FROM lessons WHERE id = ?',
            [id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aula não encontrada'
            });
        }

        const lesson = lessons[0];

        // Apenas o aluno pode cancelar
        if (lesson.student_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Apenas o aluno pode cancelar a aula'
            });
        }

        // Verificar se a aula já foi confirmada (pagamento realizado)
        const [payments] = await db.query(
            'SELECT * FROM payments WHERE lesson_id = ? AND status = "succeeded"',
            [id]
        );

        if (payments.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível cancelar aula com pagamento confirmado. Solicite reembolso.'
            });
        }

        // Cancelar aula
        await db.query(
            'UPDATE lessons SET status = "cancelled", updated_at = NOW() WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Aula cancelada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao cancelar aula:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar aula',
            error: error.message
        });
    }
});

module.exports = router;
