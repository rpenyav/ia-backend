SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `chatbot_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `chatbot_db`;

-- ===================== USERS =====================

CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario seed para poder hacer login
-- email:    test@test.com
-- password: 12345678
INSERT INTO `users` (`id`, `email`, `passwordHash`, `name`, `createdAt`, `updatedAt`)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@test.com',
  '$2b$10$aivTNH4R4oxgSgQoOlgBTepkf9x8eEEH0/ah8yBnCCFwaundY69Ne',
  'Usuario Test',
  NOW(6),
  NOW(6)
)
ON DUPLICATE KEY UPDATE email = email;

-- ================== CONVERSATIONS ==================

CREATE TABLE `conversations` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) DEFAULT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `channel` VARCHAR(100) DEFAULT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_conversations_user` (`userId`),
  CONSTRAINT `fk_conversations_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== MESSAGES ====================

CREATE TABLE `messages` (
  `id` CHAR(36) NOT NULL,
  `conversationId` CHAR(36) NOT NULL,
  `role` ENUM('user','assistant','system') NOT NULL,
  `content` TEXT NOT NULL,
  `attachments` JSON DEFAULT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation` (`conversationId`),
  CONSTRAINT `fk_messages_conversation`
    FOREIGN KEY (`conversationId`) REFERENCES `conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== SETTINGS ====================

CREATE TABLE `settings` (
  `id` CHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  `scope` VARCHAR(255) DEFAULT NULL,
  `value` JSON DEFAULT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_key_scope` (`key`,`scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Opcional) Ejemplo de prompt por defecto por tenant:
-- INSERT INTO `settings` (`id`, `key`, `scope`, `value`, `createdAt`, `updatedAt`)
-- VALUES (
--   '22222222-2222-2222-2222-222222222222',
--   'prompt.system',
--   'global',
--   JSON_OBJECT('text', 'You are a helpful assistant.'),
--   NOW(6),
--   NOW(6)
-- )
-- ON DUPLICATE KEY UPDATE `key` = `key`;

-- ====================== USAGE ======================

CREATE TABLE `usage` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) DEFAULT NULL,
  `conversationId` CHAR(36) DEFAULT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `inputTokens` INT DEFAULT NULL,
  `outputTokens` INT DEFAULT NULL,
  `totalTokens` INT DEFAULT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_usage_createdAt` (`createdAt`),
  KEY `idx_usage_user` (`userId`,`createdAt`),
  KEY `idx_usage_provider_model` (`provider`,`model`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
