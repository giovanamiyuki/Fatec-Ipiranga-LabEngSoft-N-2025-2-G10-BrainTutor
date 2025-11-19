const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async sendWelcomeEmail(userEmail, userName, userType) {
        const subject = 'Bem-vindo ao Brain Tutor! 🎓';
        const userTypeText = userType === 'teacher' ? 'Professor' : 'Aluno';
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Brain Tutor</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Conectando mentes, construindo futuros</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-bottom: 20px;">Olá, ${userName}! 👋</h2>
                    
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        Seja bem-vindo à nossa plataforma como <strong>${userTypeText}</strong>! Estamos muito felizes em tê-lo conosco.
                    </p>
                    
                    ${userType === 'teacher' ? `
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #2d5a2d; margin-top: 0;">Como Professor, você pode:</h3>
                            <ul style="color: #2d5a2d; line-height: 1.8;">
                                <li>Criar seu perfil profissional completo</li>
                                <li>Definir suas matérias e valor por hora</li>
                                <li>Receber solicitações de aulas de alunos</li>
                                <li>Gerenciar sua agenda e disponibilidade</li>
                            </ul>
                        </div>
                    ` : `
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #856404; margin-top: 0;">Como Aluno, você pode:</h3>
                            <ul style="color: #856404; line-height: 1.8;">
                                <li>Buscar professores por matéria e localização</li>
                                <li>Ver avaliações e qualificações dos professores</li>
                                <li>Agendar aulas particulares</li>
                                <li>Acompanhar seu progresso de aprendizado</li>
                            </ul>
                        </div>
                    `}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 25px; 
                                  font-weight: bold; 
                                  display: inline-block;">
                            Acessar Plataforma
                        </a>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
                        Se você tem alguma dúvida, nossa equipe de suporte está sempre pronta para ajudar!
                    </p>
                </div>
            </div>
        `;

        try {
            await this.transporter.sendMail({
                from: `"Brain Tutor" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: subject,
                html: html
            });
            console.log(`✅ Email de boas-vindas enviado para ${userEmail}`);
        } catch (error) {
            console.error('❌ Erro ao enviar email de boas-vindas:', error);
            throw error;
        }
    }

    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const subject = 'Redefinir sua senha - Brain Tutor';
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Brain Tutor</h1>
                    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Redefinição de Senha</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-bottom: 20px;">Olá, ${userName}!</h2>
                    
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        Recebemos uma solicitação para redefinir a senha da sua conta no Brain Tutor.
                    </p>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <p style="color: #333; margin: 0;">
                            Clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 15px 30px; 
                                  text-decoration: none; 
                                  border-radius: 25px; 
                                  font-weight: bold; 
                                  display: inline-block;">
                            Redefinir Senha
                        </a>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                            <strong>⚠️ Importante:</strong> Se você não solicitou esta redefinição, ignore este email. 
                            Sua senha permanecerá inalterada.
                        </p>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
                        Este link expira em 1 hora por motivos de segurança.
                    </p>
                </div>
            </div>
        `;

        try {
            await this.transporter.sendMail({
                from: `"Brain Tutor" <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: subject,
                html: html
            });
            console.log(`✅ Email de redefinição de senha enviado para ${userEmail}`);
        } catch (error) {
            console.error('❌ Erro ao enviar email de redefinição:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();