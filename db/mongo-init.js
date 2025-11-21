// mongo-init.js
// ------------------------------------------------------
// Script de inicialización de MongoDB para el backend
// Ejecutar con:
//
//   mongosh "mongodb://user:pass@host:27017/chatbot_db" mongo-init.js
//   o con Atlas:
//   mongosh "mongodb+srv://user:pass@cluster-url/chatbot_db" mongo-init.js
//
// ------------------------------------------------------

function ensureCollection(name, options = {}) {
  const existing = db.getCollectionNames();
  if (!existing.includes(name)) {
    db.createCollection(name, options);
    print(`✔ Collection '${name}' creada`);
  } else {
    print(`• Collection '${name}' ya existe, no se crea`);
    if (options.validator) {
      db.runCommand({
        collMod: name,
        validator: options.validator,
        validationLevel: "moderate",
      });
      print(`  ↳ Validator actualizado para '${name}'`);
    }
  }
}

// ======================= USERS =======================

const usersValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["email", "passwordHash", "createdAt"],
    properties: {
      _id: { bsonType: "objectId" },
      email: {
        bsonType: "string",
        description: "Email del usuario, único",
      },
      passwordHash: {
        bsonType: "string",
        description: "Hash de la contraseña",
      },
      name: {
        bsonType: ["string", "null"],
        description: "Nombre opcional",
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: ["date", "null"],
      },
    },
  },
};

ensureCollection("users", { validator: usersValidator });

// índice único por email
db.users.createIndex({ email: 1 }, { unique: true });
print("✔ Índice único en users.email");

// Usuario seed
const INITIAL_PASSWORD_HASH =
  "$2b$10$aivTNH4R4oxgSgQoOlgBTepkf9x8eEEH0/ah8yBnCCFwaundY69Ne"; // 12345678

const existingSeedUser = db.users.findOne({ email: "test@test.com" });

if (!existingSeedUser) {
  db.users.insertOne({
    email: "test@test.com",
    passwordHash: INITIAL_PASSWORD_HASH,
    name: "Usuario Test",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  print("✔ Usuario seed 'test@test.com' creado (password: 12345678)");
} else {
  print("• Usuario seed 'test@test.com' ya existe, no se crea");
}

// =================== CONVERSATIONS ===================

const conversationsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "createdAt"],
    properties: {
      _id: { bsonType: "objectId" },
      userId: {
        bsonType: "string",
        description: "ID del usuario propietario (string/uuid)",
      },
      title: {
        bsonType: ["string", "null"],
      },
      channel: {
        bsonType: ["string", "null"], // ej: "widget-web", "backoffice"
      },
      metadata: {
        bsonType: ["object", "null"],
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: ["date", "null"],
      },
    },
  },
};

ensureCollection("conversations", { validator: conversationsValidator });

// índices útiles
db.conversations.createIndex({ userId: 1, createdAt: -1 });
print("✔ Índice en conversations (userId, createdAt)");

// ======================= MESSAGES =======================

const messagesValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["conversationId", "role", "content", "createdAt"],
    properties: {
      _id: { bsonType: "objectId" },
      conversationId: {
        bsonType: "string",
        description: "ID de la conversación (string/uuid)",
      },
      role: {
        bsonType: "string",
        enum: ["user", "assistant", "system"],
        description: "Rol del mensaje",
      },
      content: {
        bsonType: "string",
      },
      attachments: {
        bsonType: ["array", "null"],
        items: {
          bsonType: "object",
        },
        description: "Adjuntos serializados (files, links, etc.)",
      },
      metadata: {
        bsonType: ["object", "null"],
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: ["date", "null"],
      },
    },
  },
};

ensureCollection("messages", { validator: messagesValidator });

// índices para recuperar historial rápido
db.messages.createIndex({ conversationId: 1, createdAt: 1 });
print("✔ Índice en messages (conversationId, createdAt)");

// ======================= SETTINGS =======================

const settingsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["key", "createdAt"],
    properties: {
      _id: { bsonType: "objectId" },
      key: {
        bsonType: "string",
        description: "Clave de setting, ej: 'prompt.system'",
      },
      value: {
        bsonType: ["string", "number", "object", "array", "bool", "null"],
      },
      scope: {
        bsonType: ["string", "null"],
        description: "Ámbito: global, tenant, etc.",
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: ["date", "null"] },
    },
  },
};

ensureCollection("settings", { validator: settingsValidator });

// clave única por key + scope
db.settings.createIndex({ key: 1, scope: 1 }, { unique: true });
print("✔ Índice único en settings (key, scope)");

// ======================== USAGE ========================

const usageValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["provider", "model", "createdAt"],
    properties: {
      _id: { bsonType: "objectId" },
      userId: {
        bsonType: ["string", "null"],
      },
      conversationId: {
        bsonType: ["string", "null"],
      },
      provider: {
        bsonType: "string", // openai | gemini | deepseek | grok | ...
      },
      model: {
        bsonType: "string",
      },
      inputTokens: {
        bsonType: ["int", "long", "double", "null"],
      },
      outputTokens: {
        bsonType: ["int", "long", "double", "null"],
      },
      totalTokens: {
        bsonType: ["int", "long", "double", "null"],
      },
      createdAt: {
        bsonType: "date",
      },
    },
  },
};

ensureCollection("usage", { validator: usageValidator });

// índices para analíticas
db.usage.createIndex({ createdAt: -1 });
db.usage.createIndex({ userId: 1, createdAt: -1 });
db.usage.createIndex({ provider: 1, model: 1, createdAt: -1 });
print("✔ Índices en usage (createdAt, userId, provider+model)");

print("✅ Inicialización Mongo completada.");
