const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const database = require('../config/database');
const emailService = require('../utils/emailService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Registrar usuário
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, userType, phone, subject, hourlyRate, description, education } = req.body;

        // Validações
        if (!name || !email || !password || !userType) {
            return res.status(400).json({
                error: true,
                message: 'Nome, email, senha e tipo de usuário são obrigatórios'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: true,
                message: 'A senha deve ter pelo menos 6 caracteres'
            });
        }

        if (!['student', 'teacher'].includes(userType)) {
            return res.status(400).json({
                error: true,
                message: 'Tipo de usuário deve ser "student" ou "teacher"'
            });
        }

        // Verificar se o email já existe
        const existingUsers = await database.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                error: true,
                message: 'Este email já está em uso'
            });
        }

        // Hash da senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Usar transação para garantir consistência
        const result = await database.transaction(async (connection) => {
            // Inserir usuário
            const [userResult] = await connection.execute(
                'INSERT INTO users (name, email, password, user_type, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, hashedPassword, userType, phone || null, true] // Auto-verificado para simplificar
            );

            const userId = userResult.insertId;

            // Se é professor, inserir dados específicos
            if (userType === 'teacher') {
                if (!subject || !hourlyRate) {
                    throw new Error('Matéria e valor por hora são obrigatórios para professores');
                }

                await connection.execute(
                    'INSERT INTO teachers (user_id, subject, description, education, hourly_rate) VALUES (?, ?, ?, ?, ?)',
                    [userId, subject, description || '', education || '', parseFloat(hourlyRate)]
                );
            } else {
                // Se é estudante, inserir dados básicos
                await connection.execute(
                    'INSERT INTO students (user_id, grade_level) VALUES (?, ?)',
                    [userId, 'Não informado']
                );
            }

            return userId;
        });

        // Gerar token JWT
        const token = jwt.sign(
            { userId: result },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Enviar email de boas-vindas (não bloqueia a resposta)
        emailService.sendWelcomeEmail(email, name, userType).catch(error => {
            console.error('Erro ao enviar email de boas-vindas:', error);
        });

        res.status(201).json({
            success: true,
            message: 'Usuário registrado com sucesso',
            data: {
                token,
                user: {
                    id: result,
                    name,
                    email,
                    userType
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: true,
                message: 'Email e senha são obrigatórios'
            });
        }

        // Buscar usuário
        const users = await database.query(
            'SELECT id, name, email, password, user_type FROM users WHERE email = ? AND is_verified = TRUE',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: true,
                message: 'Email ou senha incorretos'
            });
        }

        const user = users[0];

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: true,
                message: 'Email ou senha incorretos'
            });
        }

        // Gerar token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.user_type
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

// Solicitar redefinição de senha
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: true,
                message: 'Email é obrigatório'
            });
        }

        // Verificar se o usuário existe
        const users = await database.query(
            'SELECT id, name, email FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // Por segurança, sempre retornar sucesso mesmo se o email não existir
            return res.json({
                success: true,
                message: 'Se o email existir em nossa base, você receberá as instruções de redefinição'
            });
        }

        const user = users[0];

        // Gerar token de redefinição
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

        // Salvar token no banco
        await database.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
        );

        // Enviar email
        await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

        res.json({
            success: true,
            message: 'Instruções de redefinição enviadas para seu email'
        });

    } catch (error) {
        console.error('❌ Erro na solicitação de redefinição:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

// Redefinir senha
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: true,
                message: 'Token e nova senha são obrigatórios'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: true,
                message: 'A nova senha deve ter pelo menos 6 caracteres'
            });
        }

        // Verificar token
        const users = await database.query(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'Token inválido ou expirado'
            });
        }

        const user = users[0];

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualizar senha e limpar token
        await database.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro na redefinição de senha:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

// Verificar token (middleware de validação)
router.get('/verify', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        data: {
            user: req.user
        }
    });
});

module.exports = router;