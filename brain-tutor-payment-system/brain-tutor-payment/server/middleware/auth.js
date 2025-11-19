const jwt = require('jsonwebtoken');
const database = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: true,
                message: 'Token de acesso não fornecido'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se o usuário ainda existe
        const users = await database.query(
            'SELECT id, name, email, user_type FROM users WHERE id = ? AND is_verified = TRUE',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: true,
                message: 'Usuário não encontrado ou não verificado'
            });
        }

        req.user = {
            id: users[0].id,
            name: users[0].name,
            email: users[0].email,
            userType: users[0].user_type
        };

        next();
    } catch (error) {
        console.error('❌ Erro na autenticação:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: true,
                message: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                message: 'Token expirado'
            });
        }

        res.status(500).json({
            error: true,
            message: 'Erro interno do servidor'
        });
    }
};

const requireTeacher = async (req, res, next) => {
    if (req.user.userType !== 'teacher') {
        return res.status(403).json({
            error: true,
            message: 'Acesso negado. Apenas professores podem acessar este recurso.'
        });
    }
    next();
};

const requireStudent = async (req, res, next) => {
    if (req.user.userType !== 'student') {
        return res.status(403).json({
            error: true,
            message: 'Acesso negado. Apenas estudantes podem acessar este recurso.'
        });
    }
    next();
};

module.exports = {
    authMiddleware,
    requireTeacher,
    requireStudent
};