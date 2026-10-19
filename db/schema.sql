-- YouTube Live Chat Runner - Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, and MariaDB

CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `setting_value` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stream_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `pid` INT NULL,
  `started_at` DATETIME NOT NULL,
  `stopped_at` DATETIME NULL,
  `status` ENUM('running', 'stopped', 'error') DEFAULT 'running',
  `peak_viewers` INT DEFAULT 0,
  `total_commands` INT DEFAULT 0,
  `log_file` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leaderboard` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(128) NOT NULL UNIQUE,
  `user_name` VARCHAR(128) NOT NULL,
  `team` ENUM('BLACK', 'WHITE') NOT NULL DEFAULT 'BLACK',
  `total_votes` INT DEFAULT 0,
  `score` INT DEFAULT 0,
  `last_active` DATETIME NOT NULL,
  INDEX `idx_team_score` (`team`, `score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(128) NOT NULL,
  `raw_text` VARCHAR(255) NOT NULL,
  `team` ENUM('BLACK', 'WHITE') NOT NULL DEFAULT 'BLACK',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
