-- Criação do banco de dados Brain Tutor
CREATE DATABASE IF NOT EXISTS brain_tutor;
USE brain_tutor;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('student', 'teacher') NOT NULL,
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de professores (estende usuários)
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    education VARCHAR(500),
    experience_years INT DEFAULT 0,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    availability TEXT, -- JSON string com disponibilidade
    location VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de estudantes (estende usuários)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    grade_level VARCHAR(50),
    subjects_interest TEXT, -- JSON string com matérias de interesse
    learning_goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    student_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Tabela de aulas/sessões
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    student_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    scheduled_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Inserir dados de exemplo
INSERT INTO users (name, email, password, user_type, phone) VALUES
('Samira Alves', 'samira@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '(11) 99999-9999'),
('João Silva', 'joao@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '(11) 88888-8888'),
('Maria Santos', 'maria@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '(11) 77777-7777'),
('Pedro Oliveira', 'pedro@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '(11) 66666-6666');

INSERT INTO teachers (user_id, subject, description, education, experience_years, hourly_rate, location) VALUES
(1, 'Matemática', 'Professora de matemática com experiência em ensino fundamental e médio. Especialista em álgebra e geometria.', 'Formação USP São Carlos', 5, 90.00, 'São Paulo, SP'),
(3, 'Física', 'Professor de física com mestrado em física teórica. Experiência em preparação para vestibulares.', 'Mestrado em Física - UNICAMP', 8, 120.00, 'Campinas, SP'),
(4, 'Química', 'Doutor em química orgânica. Aulas para ensino médio e preparação para ENEM.', 'Doutorado em Química - USP', 10, 150.00, 'São Paulo, SP');

INSERT INTO students (user_id, grade_level, subjects_interest, learning_goals) VALUES
(2, 'Ensino Médio', '["Matemática", "Física", "Química"]', 'Preparação para vestibular');

-- Índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teachers_subject ON teachers(subject);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_rating ON teachers(rating);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_reviews_teacher_id ON reviews(teacher_id);