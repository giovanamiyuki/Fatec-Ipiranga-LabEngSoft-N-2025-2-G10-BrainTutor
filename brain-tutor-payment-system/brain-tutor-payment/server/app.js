const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teacherRoutes = require('./routes/teachers');
const lessonsRoutes = require('./routes/lessons');
const paymentsRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL
    ],
    credentials: true
}));

// Webhook endpoint ANTES de express.json() (precisa de raw body)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use('/client', express.static(path.join(__dirname, '../client')));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Brain Tutor API'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/payments', paymentsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: `Rota ${req.method} ${req.path} não existe`
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Erro na aplicação:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Erro interno do servidor';
    
    res.status(statusCode).json({
        error: true,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Recebido SIGTERM, encerrando servidor...');
    const database = require('./config/database');
    await database.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Recebido SIGINT, encerrando servidor...');
    const database = require('./config/database');
    await database.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor Brain Tutor rodando na porta ${PORT}`);
    console.log(`📱 Frontend: http://localhost:3000`);
    console.log(`🔗 API: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;