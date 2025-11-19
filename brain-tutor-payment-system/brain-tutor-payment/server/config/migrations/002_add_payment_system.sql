-- ============================================================
-- MIGRATION 002: Payment System (Stripe Integration)
-- Brain Tutor - Sistema de Pagamento e Agendamento de Aulas
-- ============================================================

-- Tabela de Aulas Agendadas
CREATE TABLE IF NOT EXISTS lessons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    scheduled_date DATETIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 50,
    price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    meeting_link VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'brl',
    status ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_method_details JSON,
    failure_reason VARCHAR(255),
    refund_amount DECIMAL(10, 2),
    refund_reason VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_stripe_payment_intent_id (stripe_payment_intent_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Webhooks do Stripe
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payment_intent_id VARCHAR(255),
    payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_event_id (event_id),
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed),
    INDEX idx_payment_intent_id (payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Transações (Auditoria)
CREATE TABLE IF NOT EXISTS payment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    change_reason VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payment_id (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar campo de preço por hora na tabela teachers (se não existir)
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 50.00 AFTER bio;

-- Inserir dados de exemplo para testes
INSERT INTO lessons (student_id, teacher_id, subject, description, scheduled_date, duration_minutes, price, status)
VALUES 
    (1, 2, 'Matemática', 'Aula de cálculo diferencial', '2025-04-20 14:00:00', 50, 45.00, 'pending'),
    (1, 2, 'Física', 'Revisão de termodinâmica', '2025-04-22 16:00:00', 50, 45.00, 'confirmed');

-- Criar trigger para atualizar histórico de pagamentos
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS payment_status_history 
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO payment_history (payment_id, previous_status, new_status, metadata)
        VALUES (NEW.id, OLD.status, NEW.status, JSON_OBJECT('updated_at', NOW()));
    END IF;
END$$

DELIMITER ;

-- Comentários para documentação
ALTER TABLE lessons COMMENT = 'Armazena todas as aulas agendadas entre alunos e professores';
ALTER TABLE payments COMMENT = 'Registra todos os pagamentos realizados via Stripe';
ALTER TABLE payment_webhooks COMMENT = 'Log de eventos recebidos do Stripe via webhook';
ALTER TABLE payment_history COMMENT = 'Histórico de mudanças de status dos pagamentos (auditoria)';

-- Verificação final
SELECT 'Migration 002 executada com sucesso!' AS status;
SELECT COUNT(*) AS total_lessons FROM lessons;
SELECT COUNT(*) AS total_payments FROM payments;
