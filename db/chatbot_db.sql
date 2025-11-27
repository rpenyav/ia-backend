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


-- Tabla para variables de configuración gestionadas desde backoffice
CREATE TABLE IF NOT EXISTS env_vars (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  `key`       VARCHAR(255)  NOT NULL UNIQUE,
  `value`     TEXT          NOT NULL,
  description VARCHAR(255)  NULL,
  is_secret   TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seeds iniciales
INSERT INTO env_vars (id, `key`, `value`, description, is_secret)
VALUES
  -- AUTENTICACIÓN GLOBAL
  (UUID(), 'CHAT_AUTH_MODE', 'local', 'none | local | oauth2', 0),
  (UUID(), 'AUTH_STRATEGY', 'none', 'none | api_key | oauth2', 0),
  (UUID(), 'INTERNAL_API_KEY', 'CHANGE_ME_INTERNAL_API_KEY', 'API key interna para AUTH_STRATEGY=api_key', 1),

  -- AUTH USUARIOS (JWT)
  (UUID(), 'JWT_SECRET', 'CHANGE_ME_JWT_SECRET', 'JWT secret', 1),
  (UUID(), 'JWT_EXPIRES_IN', '1h', 'TTL del JWT (p.ej. 1h, 2d)', 0),

  -- IA – VALORES POR DEFECTO DE INSTALACIÓN
  (UUID(), 'DEFAULT_LLM_PROVIDER', 'openai', 'Proveedor LLM por defecto (openai | grok | gemini | deepseek)', 0),
  (UUID(), 'DEFAULT_LLM_MODEL', 'gpt-4o-mini', 'Modelo LLM por defecto', 0),
  (UUID(), 'DEFAULT_LLM_TEMPERATURE', '0.2', 'Temperatura por defecto', 0),
  (UUID(), 'DEFAULT_LLM_MAX_TOKENS', '200', 'Tokens máximos por defecto', 0),

  -- IA – API KEYS (poner las reales desde backoffice)
  (UUID(), 'OPENAI_API_KEY', 'CHANGE_ME_OPENAI', 'OpenAI API key', 1),
  (UUID(), 'GEMINI_API_KEY', 'CHANGE_ME_GEMINI', 'Gemini API key', 1),
  (UUID(), 'GROK_API_KEY', 'CHANGE_ME_GROK', 'Grok API key', 1),
  (UUID(), 'DEEPSEEK_API_KEY', 'CHANGE_ME_DEEPSEEK', 'Deepseek API key', 1),

  -- IA – BASE URLs
  (UUID(), 'OPENAI_BASE_URL', 'https://api.openai.com/v1', 'Base URL OpenAI', 0),
  (UUID(), 'GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta', 'Base URL Gemini', 0),
  (UUID(), 'GROK_BASE_URL', 'https://api.x.ai/v1', 'Base URL Grok', 0),
  (UUID(), 'DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1', 'Base URL Deepseek', 0),

  -- PROXY CORPORATIVO
  (UUID(), 'HTTP_PROXY', '', 'Proxy HTTP corporativo (opcional)', 0),
  (UUID(), 'HTTPS_PROXY', '', 'Proxy HTTPS corporativo (opcional)', 0),

  -- LOGGING / OBSERVABILIDAD
  (UUID(), 'LOG_LEVEL', 'info', 'Nivel de logs (error | warn | info | debug)', 0),
  (UUID(), 'HTTP_LOGGING_ENABLED', 'true', 'Logs HTTP habilitados', 0),
  (UUID(), 'METRICS_ENABLED', 'false', 'Exponer métricas Prometheus', 0),
  (UUID(), 'METRICS_PORT', '9100', 'Puerto para métricas', 0),

  -- STORAGE
  (UUID(), 'STORAGE_PROVIDER', 'cloudinary', 'cloudinary | s3 | local', 0),

  (UUID(), 'CLOUDINARY_CLOUD_NAME', 'CHANGE_ME_CLOUD_NAME', 'Cloudinary cloud name', 0),
  (UUID(), 'CLOUDINARY_API_KEY', 'CHANGE_ME_CLOUDINARY_API_KEY', 'Cloudinary API key', 1),
  (UUID(), 'CLOUDINARY_API_SECRET', 'CHANGE_ME_CLOUDINARY_API_SECRET', 'Cloudinary API secret', 1),

  (UUID(), 'S3_ENDPOINT', '', 'Endpoint S3/MinIO (opcional)', 0),
  (UUID(), 'S3_REGION', '', 'Región S3', 0),
  (UUID(), 'S3_BUCKET', '', 'Bucket S3/MinIO', 0),
  (UUID(), 'S3_ACCESS_KEY_ID', '', 'Access key S3/MinIO', 1),
  (UUID(), 'S3_SECRET_ACCESS_KEY', '', 'Secret key S3/MinIO', 1)
ON DUPLICATE KEY UPDATE
  -- NO tocamos value si ya existe (para no pisar cambios hechos desde backoffice)
  description = VALUES(description),
  is_secret   = VALUES(is_secret);


CREATE TABLE IF NOT EXISTS backoffice_admins (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Super admin inicial (cambia el hash por uno real de bcrypt)
INSERT INTO backoffice_admins (id, email, password_hash)
VALUES (
  UUID(),
  'admin@backoffice.local',
  '$2b$10$REEMPLAZA_ESTE_HASH_POR_EL_DE_TU_PASSWORD'
)
ON DUPLICATE KEY UPDATE email = email;