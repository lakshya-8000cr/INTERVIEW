-- Create the database
CREATE DATABASE IF NOT EXISTS interview_optimizer;

USE interview_optimizer;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  interview_type VARCHAR(50),
  status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  duration_minutes INT NULL,
  total_questions INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Create interview_conversations table
CREATE TABLE IF NOT EXISTS interview_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  message_type ENUM('question', 'answer'),
  content TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sequence_number INT,
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_session_sequence (session_id, sequence_number)
);

-- Create interview_feedback table
CREATE TABLE IF NOT EXISTS interview_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT UNIQUE,
  overall_score DECIMAL(3,1) NULL,
  technical_accuracy TEXT NULL,
  communication_quality TEXT NULL,
  areas_of_improvement TEXT NULL,
  strengths TEXT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
);