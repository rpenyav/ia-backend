// mongo-init.js
// Script de inicialización de la BBDD chatbot_db (parte de env_vars)

db = db.getSiblingDB("chatbot_db");

// Crear colección si no existe
if (!db.getCollectionNames().includes("env_vars")) {
  db.createCollection("env_vars");
}

// Índice único por key
db.env_vars.createIndex({ key: 1 }, { unique: true });

// Variables que se gestionan desde backoffice
const envVars = [
  // AUTENTICACIÓN GLOBAL
  {
    key: "CHAT_AUTH_MODE",
    value: "local",
    description: "none | local | oauth2",
    isSecret: false,
  },
  {
    key: "AUTH_STRATEGY",
    value: "none",
    description: "none | api_key | oauth2",
    isSecret: false,
  },
  {
    key: "INTERNAL_API_KEY",
    value: "CHANGE_ME_INTERNAL_API_KEY",
    description: "API key interna para AUTH_STRATEGY=api_key",
    isSecret: true,
  },

  // AUTH USUARIOS (JWT)
  {
    key: "JWT_SECRET",
    value: "CHANGE_ME_JWT_SECRET",
    description: "JWT secret",
    isSecret: true,
  },
  {
    key: "JWT_EXPIRES_IN",
    value: "1h",
    description: "TTL del JWT (p.ej. 1h, 2d)",
    isSecret: false,
  },

  // IA – VALORES POR DEFECTO
  {
    key: "DEFAULT_LLM_PROVIDER",
    value: "openai",
    description:
      "Proveedor LLM por defecto (openai | grok | gemini | deepseek)",
    isSecret: false,
  },
  {
    key: "DEFAULT_LLM_MODEL",
    value: "gpt-4o-mini",
    description: "Modelo LLM por defecto",
    isSecret: false,
  },
  {
    key: "DEFAULT_LLM_TEMPERATURE",
    value: "0.2",
    description: "Temperatura por defecto",
    isSecret: false,
  },
  {
    key: "DEFAULT_LLM_MAX_TOKENS",
    value: "200",
    description: "Tokens máximos por defecto",
    isSecret: false,
  },

  // IA – API KEYS (rellenar desde backoffice)
  {
    key: "OPENAI_API_KEY",
    value: "CHANGE_ME_OPENAI",
    description: "OpenAI API key",
    isSecret: true,
  },
  {
    key: "GEMINI_API_KEY",
    value: "CHANGE_ME_GEMINI",
    description: "Gemini API key",
    isSecret: true,
  },
  {
    key: "GROK_API_KEY",
    value: "CHANGE_ME_GROK",
    description: "Grok API key",
    isSecret: true,
  },
  {
    key: "DEEPSEEK_API_KEY",
    value: "CHANGE_ME_DEEPSEEK",
    description: "Deepseek API key",
    isSecret: true,
  },

  // IA – BASE URLs
  {
    key: "OPENAI_BASE_URL",
    value: "https://api.openai.com/v1",
    description: "Base URL OpenAI",
    isSecret: false,
  },
  {
    key: "GEMINI_BASE_URL",
    value: "https://generativelanguage.googleapis.com/v1beta",
    description: "Base URL Gemini",
    isSecret: false,
  },
  {
    key: "GROK_BASE_URL",
    value: "https://api.x.ai/v1",
    description: "Base URL Grok",
    isSecret: false,
  },
  {
    key: "DEEPSEEK_BASE_URL",
    value: "https://api.deepseek.com/v1",
    description: "Base URL Deepseek",
    isSecret: false,
  },

  // PROXY CORPORATIVO
  {
    key: "HTTP_PROXY",
    value: "",
    description: "Proxy HTTP corporativo (opcional)",
    isSecret: false,
  },
  {
    key: "HTTPS_PROXY",
    value: "",
    description: "Proxy HTTPS corporativo (opcional)",
    isSecret: false,
  },

  // LOGGING / OBSERVABILIDAD
  {
    key: "LOG_LEVEL",
    value: "info",
    description: "Nivel de logs (error | warn | info | debug)",
    isSecret: false,
  },
  {
    key: "HTTP_LOGGING_ENABLED",
    value: "true",
    description: "Logs HTTP habilitados",
    isSecret: false,
  },
  {
    key: "METRICS_ENABLED",
    value: "false",
    description: "Exponer métricas Prometheus",
    isSecret: false,
  },
  {
    key: "METRICS_PORT",
    value: "9100",
    description: "Puerto para métricas",
    isSecret: false,
  },

  // STORAGE
  {
    key: "STORAGE_PROVIDER",
    value: "cloudinary",
    description: "cloudinary | s3 | local",
    isSecret: false,
  },
  {
    key: "CLOUDINARY_CLOUD_NAME",
    value: "CHANGE_ME_CLOUD_NAME",
    description: "Cloudinary cloud name",
    isSecret: false,
  },
  {
    key: "CLOUDINARY_API_KEY",
    value: "CHANGE_ME_CLOUDINARY_API_KEY",
    description: "Cloudinary API key",
    isSecret: true,
  },
  {
    key: "CLOUDINARY_API_SECRET",
    value: "CHANGE_ME_CLOUDINARY_API_SECRET",
    description: "Cloudinary API secret",
    isSecret: true,
  },
  {
    key: "S3_ENDPOINT",
    value: "",
    description: "Endpoint S3/MinIO (opcional)",
    isSecret: false,
  },
  {
    key: "S3_REGION",
    value: "",
    description: "Región S3",
    isSecret: false,
  },
  {
    key: "S3_BUCKET",
    value: "",
    description: "Bucket S3/MinIO",
    isSecret: false,
  },
  {
    key: "S3_ACCESS_KEY_ID",
    value: "",
    description: "Access key S3/MinIO",
    isSecret: true,
  },
  {
    key: "S3_SECRET_ACCESS_KEY",
    value: "",
    description: "Secret key S3/MinIO",
    isSecret: true,
  },
];

// Upsert: si no existe la key, la crea; si existe, NO pisa el value
envVars.forEach((doc) => {
  db.env_vars.updateOne(
    { key: doc.key },
    { $setOnInsert: doc },
    { upsert: true }
  );
});

// Super admin del backoffice
if (!db.getCollectionNames().includes("backoffice_admins")) {
  db.createCollection("backoffice_admins");
}

db.backoffice_admins.createIndex({ email: 1 }, { unique: true });

// OJO: cambia el hash por uno real de bcrypt
db.backoffice_admins.updateOne(
  { email: "admin@backoffice.local" },
  {
    $setOnInsert: {
      email: "admin@backoffice.local",
      passwordHash: "$2b$10$REEMPLAZA_ESTE_HASH_POR_EL_DE_TU_PASSWORD",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  { upsert: true }
);
