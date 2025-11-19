const express = require('express');
const database = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Obter perfil do usuário logado
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar dados básicos do usuário
        const users = await database.query(
            `SELECT u.id, u.name, u.email, u.user_type, u.phone, u.profile_image, u.created_at
             FROM users u WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'Usuário não encontrado'
            });
        }

        const user = users[0];
        let profileData = { ...user };

        // Se for professor, buscar dados específicos
        if (user.user_type === 'teacher') {
            const teachers = await database.query(
                `SELECT t.subject, t.description, t.education, t.experience_years, 
                        t.hourly_rate, t.availability, t.location, t.rating, t.total_reviews, t.is_active
                 FROM teachers t WHERE t.user_id = ?`,
                [userId]
            );

            if (teachers.length > 0) {
                profileData.teacherInfo = teachers[0];
            }
        }

        // Se for estudante, buscar dados específicos
        if (user.user_type === 'student') {
            const students = await database.query(
                `SELECT s.grade_level, s.subjects_interest, s.learning_goals
                 FROM students s WHERE s.user_id = ?`,
                [userId]
            );

            if (students.length > 0) {
                profileData.studentInfo = students[0];
                // Converter JSON string para object se necessário
                if (profileData.studentInfo.subjects_interest) {
                    try {
                        profileData.studentInfo.subjects_interest = JSON.parse(profileData.studentInfo.subjects_interest);
                    } catch (e) {
                        profileData.studentInfo.subjects_interest = [];
                    }
                }
            }
        }

        res.json({
            success: true,
            message: 'Perfil obtido com sucesso',
            data: profileData
        });

    } catch (error) {
        console.error('❌ Erro ao obter perfil:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

// Atualizar perfil do usuário
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone, profileImage, teacherInfo, studentInfo } = req.body;

        // Validações básicas
        if (!name) {
            return res.status(400).json({
                error: true,
                message: 'Nome é obrigatório'
            });
        }

        // Usar transação para garantir consistência
        await database.transaction(async (connection) => {
            // Atualizar dados básicos do usuário
            await connection.execute(
                'UPDATE users SET name = ?, phone = ?, profile_image = ? WHERE id = ?',
                [name, phone || null, profileImage || null, userId]
            );

            // Se for professor e há dados específicos
            if (req.user.userType === 'teacher' && teacherInfo) {
                const {
                    subject,
                    description,
                    education,
                    experienceYears,
                    hourlyRate,
                    availability,
                    location,
                    isActive
                } = teacherInfo;

                await connection.execute(
                    `UPDATE teachers SET 
                     subject = ?, description = ?, education = ?, experience_years = ?,
                     hourly_rate = ?, availability = ?, location = ?, is_active = ?
                     WHERE user_id = ?`,
                    [
                        subject || '',
                        description || '',
                        education || '',
                        parseInt(experienceYears) || 0,
                        parseFloat(hourlyRate) || 0,
                        availability || null,
                        location || '',
                        isActive !== false, // default true
                        userId
                    ]
                );
            }

            // Se for estudante e há dados específicos
            if (req.user.userType === 'student' && studentInfo) {
                const { gradeLevel, subjectsInterest, learningGoals } = studentInfo;

                await connection.execute(
                    'UPDATE students SET grade_level = ?, subjects_interest = ?, learning_goals = ? WHERE user_id = ?',
                    [
                        gradeLevel || 'Não informado',
                        JSON.stringify(subjectsInterest) || '[]',
                        learningGoals || '',
                        userId
                    ]
                );
            }
        });

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar perfil:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

// Obter estatísticas do usuário (dashboard)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        let stats = {};

        if (req.user.userType === 'teacher') {
            // Estatísticas do professor
            const teacherData = await database.query(
                `SELECT t.id FROM teachers t WHERE t.user_id = ?`,
                [userId]
            );

            if (teacherData.length > 0) {
                const teacherId = teacherData[0].id;

                // Total de aulas
                const [totalSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE teacher_id = ?',
                    [teacherId]
                );

                // Aulas concluídas
                const [completedSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE teacher_id = ? AND status = "completed"',
                    [teacherId]
                );

                // Próximas aulas
                const [upcomingSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE teacher_id = ? AND status = "scheduled" AND scheduled_date > NOW()',
                    [teacherId]
                );

                // Avaliações
                const [reviewsData] = await database.query(
                    'SELECT COUNT(*) as total, AVG(rating) as avgRating FROM reviews WHERE teacher_id = ?',
                    [teacherId]
                );

                stats = {
                    totalSessions: totalSessions.total || 0,
                    completedSessions: completedSessions.total || 0,
                    upcomingSessions: upcomingSessions.total || 0,
                    totalReviews: reviewsData.total || 0,
                    averageRating: parseFloat(reviewsData.avgRating) || 0
                };
            }
        } else {
            // Estatísticas do estudante
            const studentData = await database.query(
                `SELECT s.id FROM students s WHERE s.user_id = ?`,
                [userId]
            );

            if (studentData.length > 0) {
                const studentId = studentData[0].id;

                // Total de aulas
                const [totalSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE student_id = ?',
                    [studentId]
                );

                // Aulas concluídas
                const [completedSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE student_id = ? AND status = "completed"',
                    [studentId]
                );

                // Próximas aulas
                const [upcomingSessions] = await database.query(
                    'SELECT COUNT(*) as total FROM sessions WHERE student_id = ? AND status = "scheduled" AND scheduled_date > NOW()',
                    [studentId]
                );

                stats = {
                    totalSessions: totalSessions.total || 0,
                    completedSessions: completedSessions.total || 0,
                    upcomingSessions: upcomingSessions.total || 0
                };
            }
        }

        res.json({
            success: true,
            message: 'Estatísticas obtidas com sucesso',
            data: stats
        });

    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;