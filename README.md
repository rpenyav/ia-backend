# ia-backend
Backend nestJS para la IA entregable

## Setup bbdd
El usuario inicial para mongoDB se crea al importar el archivo db/mongo-init.js
El usuario inicial para MySQL se crea al importar el archivo db/chatbot_db.sql

usuario: test@test.com 
password: 12345678

## Postman collection
el archivo está en el root path del proyecto como IABACK.postman_collection


# Backend IA – Guía de instalación y configuración

Este documento explica cómo desplegar y configurar el backend de chat IA en un entorno nuevo, usando el archivo `.env` proporcionado y las bases de datos soportadas (MySQL o MongoDB).

---

## 1. Requisitos previos

### 1.1. Software

- **Node.js** >= 20.x (recomendado LTS)
- **Yarn** o **npm**
- Al menos uno de los siguientes motores de base de datos:
  - **MySQL / MariaDB**
  - **MongoDB** (incluido Atlas)
- Acceso a al menos **un proveedor LLM**:
  - OpenAI
  - Gemini
  - DeepSeek
  - Grok (xAI)
- (Opcional) Cuenta en **Cloudinary** si quieres soportar adjuntos en los mensajes (imágenes, PDFs, etc).

### 1.2. Clonar el proyecto

```bash
git clone <URL_DEL_REPO> ia-backend
cd ia-backend
```

### 1.3. Instalar dependencias

```bash
yarn install
# o
npm install
```

---

## 2. Configuración del entorno (.env)

Crea un archivo `.env` en la raíz del proyecto (junto a `package.json`) con este contenido base y ajusta los valores según tu entorno:

```env
########################################
# APP
########################################

NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000

APP_ID=dev-app

########################################
# AUTENTICACIÓN GLOBAL
########################################

# Modo de autenticación del CHAT:
# - none  → sin login, sin token
# - local → login contra nuestra BBDD (users + JWT)
# - oauth2 → login externo (LDAP/OAuth2) pero también con Bearer token
CHAT_AUTH_MODE=local
# (NOTA: el resto de endpoints (users, conversations, settings, usage, etc.)
#       SÍ requieren siempre autenticación con Bearer token, aunque CHAT_AUTH_MODE=none)

# Estrategia de autenticación global de la API:
# - none    → sin api-key global
# - api_key → header x-api-key obligatorio
# - oauth2  → (futuro: SSO/OAuth2)
AUTH_STRATEGY=none

# Solo si AUTH_STRATEGY=api_key
INTERNAL_API_KEY=mi_super_api_key_larga_1234

########################################
# AUTH USUARIOS (JWT)
########################################

JWT_SECRET=super_secreto_dev_123456789
JWT_EXPIRES_IN=1h

########################################
# BASE DE DATOS  mysql o mongodb
########################################
DB_DRIVER=mysql 

########################################
# BASE DE DATOS (MongoDB)
########################################
##DB_URL=mongodb+srv://USER:PASS@cluster-url/chatbot_db

########################################
# BASE DE DATOS (MySQL)
########################################
DB_URL=mysql://chatbot_user:chatbot_pass@localhost:3306/chatbot_db

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=chatbot_db

########################################
# IA – VALORES POR DEFECTO DE INSTALACIÓN
########################################

DEFAULT_LLM_PROVIDER=openai # grok | openai | gemini | deepseek
DEFAULT_LLM_MODEL=gpt-4o-mini # grok-4-latest | deepseek-chat | gemini-3-pro-preview
DEFAULT_LLM_TEMPERATURE=0.2
DEFAULT_LLM_MAX_TOKENS=200

# Claves de API
OPENAI_API_KEY=TU_API_KEY_OPENAI
GEMINI_API_KEY=TU_API_KEY_GEMINI
GROK_API_KEY=TU_API_KEY_GROK
DEEPSEEK_API_KEY=TU_API_KEY_DEEPSEEK

# URLs válidas para Joi.string().uri()
OPENAI_BASE_URL=https://api.openai.com/v1
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GROK_BASE_URL=https://api.x.ai/v1
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

########################################
# PROXY CORPORATIVO (NIVEL INSTALACIÓN)
########################################
# Si no usas proxy, deja las líneas comentadas
#HTTP_PROXY=http://proxy.local:3128
#HTTPS_PROXY=http://proxy.local:3128

########################################
# LOGGING / OBSERVABILIDAD
########################################

LOG_LEVEL=info
HTTP_LOGGING_ENABLED=true

METRICS_ENABLED=false
METRICS_PORT=9100

########################################
# STORAGE (adjuntos)
########################################

# cloudinary | s3 | local
STORAGE_PROVIDER=cloudinary

# Cloudinary
CLOUDINARY_CLOUD_NAME=TU_CLOUD_NAME
CLOUDINARY_API_KEY=TU_API_KEY
CLOUDINARY_API_SECRET=TU_API_SECRET

# S3 / MinIO (si se usa STORAGE_PROVIDER=s3; opcional)
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

> ⚠️ **IMPORTANTE**: no subas el archivo `.env` a repositorios públicos.

---

## 3. Configuración de la base de datos

El backend soporta **MySQL** y **MongoDB** mediante un `DB_DRIVER` configurable.

### 3.1. Opción A – MySQL / MariaDB

1. Crea la base de datos `chatbot_db`.
2. Ejecuta el script SQL de inicialización (`mysql-init.sql` o similar) en tu servidor MySQL:

   ```bash
   mysql -u root -p chatbot_db < db/mysql-init.sql
   ```

   El script:
   - Crea las tablas: `users`, `conversations`, `messages`, `settings`, `usage`.
   - Crea un **usuario seed**:

     - Email: `test@test.com`  
     - Password: `12345678` (hash bcrypt ya incluido)

3. Asegúrate de que la cadena `DB_URL` y los campos `DB_HOST`, `DB_USER`, etc. del `.env` apuntan a tu instancia.

Ejemplo mínimo de configuración MySQL en `.env`:

```env
DB_DRIVER=mysql
DB_URL=mysql://chatbot_user:chatbot_pass@localhost:3306/chatbot_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=chatbot_db
```

> En un cliente (phpMyAdmin, Workbench, etc.) deberías ver las tablas y el usuario `test@test.com`.

---

### 3.2. Opción B – MongoDB / MongoDB Atlas

1. Crea una base de datos (o “database”) llamada `chatbot_db`.
2. Ejecuta el script `mongo-init.js` sobre esa base de datos:

   ```bash
   mongosh "mongodb+srv://USER:PASS@cluster-url/chatbot_db" db/mongo-init.js
   ```

   El script:
   - Crea las colecciones: `users`, `conversations`, `messages`, `settings`, `usage`.
   - Crea un índice único para `users.email` y otros índices útiles.
   - Inserta un **usuario seed**:

     - Email: `test@test.com`  
     - Password: `12345678` (hash bcrypt ya incluido)

3. En el `.env`, configura:

```env
DB_DRIVER=mongodb
DB_URL=mongodb+srv://USER:PASS@cluster-url/chatbot_db
```

> Cuando `DB_DRIVER=mongodb`, el backend utilizará los modelos Mongoose y las colecciones de Mongo; cuando `DB_DRIVER=mysql`, usará TypeORM y las tablas SQL.

---

## 4. Autenticación del chat y de la API

### 4.1. Modos de autenticación del chat (`CHAT_AUTH_MODE`)

- `none`  
  - No se requiere login para usar `/chat/message`.
  - No se guardan conversaciones ni mensajes en BBDD.
  - No se permiten **adjuntos** (archivos/imágenes) en mensajes de chat.

- `local`  
  - El usuario debe autenticarse con email/password contra la tabla/colección `users`.
  - Se emite un **JWT** y se usa `Authorization: Bearer <token>` en las llamadas.
  - Las conversaciones y mensajes se guardan en BBDD.
  - Se permiten adjuntos (si `STORAGE_PROVIDER` está bien configurado).

- `oauth2` (planificado)  
  - El chat se integrará con un proveedor externo (LDAP/OAuth2), pero igualmente el backend usará Bearer token internamente.

> Independientemente de `CHAT_AUTH_MODE`, **el resto de endpoints** (`/users`, `/conversations`, `/settings`, `/usage`, etc.) siempre requieren `Authorization: Bearer <token>`.

### 4.2. Estrategia global (`AUTH_STRATEGY`)

- `none`: no se exige `x-api-key` para acceder a la API.
- `api_key`: todas las peticiones deben incluir `x-api-key: <INTERNAL_API_KEY>`.
- `oauth2`: reservado para escenarios futuros de SSO.

---

## 5. Proveedores LLM soportados

Configuras el proveedor y modelo por defecto en `.env`:

```env
DEFAULT_LLM_PROVIDER=openai   # openai | gemini | deepseek | grok
DEFAULT_LLM_MODEL=gpt-4o-mini # según el proveedor
```

Valores típicos:

- **OpenAI**
  - `DEFAULT_LLM_PROVIDER=openai`
  - `DEFAULT_LLM_MODEL=gpt-4o-mini`
  - Requiere `OPENAI_API_KEY` y `OPENAI_BASE_URL`.

- **Gemini**
  - `DEFAULT_LLM_PROVIDER=gemini`
  - `DEFAULT_LLM_MODEL=gemini-3-pro-preview`
  - Requiere `GEMINI_API_KEY` y `GEMINI_BASE_URL`.

- **DeepSeek**
  - `DEFAULT_LLM_PROVIDER=deepseek`
  - `DEFAULT_LLM_MODEL=deepseek-chat`
  - Requiere `DEEPSEEK_API_KEY` y `DEEPSEEK_BASE_URL`.

- **Grok (xAI)**
  - `DEFAULT_LLM_PROVIDER=grok`
  - `DEFAULT_LLM_MODEL=grok-4-latest`
  - Requiere `GROK_API_KEY` y `GROK_BASE_URL`.

El servicio `LlmOrchestratorService` se encarga de hablar con cada API y de registrar el uso en la tabla/colección `usage` al finalizar cada generación.

---

## 6. Adjuntos de chat (Storage)

El backend permite subir adjuntos (imágenes, PDFs…) con `multer` y un proveedor de storage.

Por defecto:

- `STORAGE_PROVIDER=cloudinary`
- Se necesitan:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

Otros modos (`s3`, `local`) están preparados a nivel de código pero no implementados aún (lanzan error si se usan).

> ⚠️ En **modo público** (`CHAT_AUTH_MODE=none`), los adjuntos están deshabilitados y el backend devolverá error si se envía `attachments` en el mensaje.

---

## 7. Endpoints principales y pruebas con Postman

### 7.1. Login

1. Asegúrate de tener el usuario seed:

   - Email: `test@test.com`
   - Password: `12345678`

2. Endpoint:

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "12345678"
}
```

Respuesta (ejemplo):

```json
{
  "access_token": "<JWT_TOKEN>",
  "user": {
    "id": "...",
    "email": "test@test.com",
    "name": "Usuario Test"
  }
}
```

Copia el `access_token` para usarlo en el resto de peticiones.

---

### 7.2. Users (CRUD)

Todas las rutas requieren:

- `Authorization: Bearer <JWT_TOKEN>`

#### Crear usuario

```http
POST http://localhost:3000/users
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "email": "nuevo@test.com",
  "password": "12345678",
  "name": "Nuevo Usuario"
}
```

#### Listar usuarios

```http
GET http://localhost:3000/users
Authorization: Bearer <JWT_TOKEN>
```

#### Obtener usuario por id

```http
GET http://localhost:3000/users/{id}
Authorization: Bearer <JWT_TOKEN>
```

#### Actualizar usuario

```http
PATCH http://localhost:3000/users/{id}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Nombre Actualizado"
}
```

#### Eliminar usuario

```http
DELETE http://localhost:3000/users/{id}
Authorization: Bearer <JWT_TOKEN>
```

---

### 7.3. Conversaciones (CRUD)

Todas las rutas requieren Bearer token.

#### Crear conversación

```http
POST http://localhost:3000/conversations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Soporte facturación",
  "channel": "widget-web"
}
```

#### Listar conversaciones del usuario autenticado

```http
GET http://localhost:3000/conversations
Authorization: Bearer <JWT_TOKEN>
```

#### Obtener una conversación (con mensajes)

```http
GET http://localhost:3000/conversations/{conversationId}
Authorization: Bearer <JWT_TOKEN>
```

#### Actualizar conversación

```http
PATCH http://localhost:3000/conversations/{conversationId}
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Título actualizado"
}
```

#### Eliminar conversación (y sus mensajes)

```http
DELETE http://localhost:3000/conversations/{conversationId}
Authorization: Bearer <JWT_TOKEN>
```

---

### 7.4. Chat (stream SSE)

#### 7.4.1. Sin autenticación (`CHAT_AUTH_MODE=none`)

- No necesitas Bearer token.
- No se guarda nada en BBDD.
- No se permiten adjuntos.

```http
POST http://localhost:3000/chat/message
Content-Type: application/json

{
  "message": "Hola, ¿qué tal?"
}
```

El backend responde como **Server-Sent Events (SSE)**. En Postman, verás trozos de JSON con `delta` hasta que la respuesta termina.

#### 7.4.2. Con autenticación (`CHAT_AUTH_MODE=local`)

- Necesitas `Authorization: Bearer <JWT_TOKEN>`.
- Puedes (opcionalmente) pasar `conversationId` para continuar una conversación.

```http
POST http://localhost:3000/chat/message
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "conversationId": "ID_EXISTENTE_O_NULL",
  "message": "Quiero hacer una consulta",
  "attachments": [
    {
      "type": "file",
      "url": "https://.../mi-archivo.pdf",
      "filename": "mi-archivo.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 123456
    }
  ]
}
```

> Normalmente, los `attachments.url` vendrán del endpoint de subida de archivos (ej. `/storage/upload`) que guarda en Cloudinary y devuelve la URL.

---

### 7.5. Settings (Prompt y configuración avanzada)

Solo accesible con Bearer token.

#### Crear/actualizar setting vía API

```http
POST http://localhost:3000/settings
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "key": "prompt.system",
  "scope": "dev-app",
  "value": "Eres un asistente útil orientado a soporte de clientes."
}
```

- Si no existe, se crea.
- Si existe, se puede actualizar vía `PATCH /settings/:id`.

El `PromptService` usará:

- `scope = APP_ID` (por defecto), con fallback a `scope = "global"`.
- Si no existe ningún setting, utiliza el `DEFAULT_SYSTEM_PROMPT` embebido en código.

---

### 7.6. Usage (métricas de tokens)

 endpoints de sólo lectura, útiles para métricas.

- Listar últimos usos:

```http
GET http://localhost:3000/usage
Authorization: Bearer <JWT_TOKEN>
```

- Por usuario:

```http
GET http://localhost:3000/usage/by-user/{userId}
Authorization: Bearer <JWT_TOKEN>
```

- Por conversación:

```http
GET http://localhost:3000/usage/by-conversation/{conversationId}
Authorization: Bearer <JWT_TOKEN>
```

Por ahora se registran los usos con `inputTokens/outputTokens/totalTokens` a nivel básico; se puede extender para leer los valores reales que devuelvan los proveedores LLM.

---

## 8. Puesta en marcha

Con todo configurado:

```bash
yarn start:dev
# o
npm run start:dev
```

Deberías ver algo como:

```text
[Nest] xxxx   - ...   LOG [NestFactory] Starting Nest application...
[Nest] xxxx   - ...   LOG [InstanceLoader] ...
...
[Nest] xxxx   - ...   LOG [NestApplication] Nest application successfully started
```

Prueba `http://localhost:3000/auth/login` desde Postman con el usuario seed `test@test.com / 12345678` y a partir de ahí podrás probar el resto de endpoints.

---

## 9. Resumen rápido de pasos

1. Clonar repo e instalar dependencias.
2. Crear `.env` con:
   - `DB_DRIVER` (mysql / mongodb)
   - Credenciales de BBDD
   - `CHAT_AUTH_MODE`, `AUTH_STRATEGY`
   - Claves de LLM (OpenAI/Gemini/DeepSeek/Grok)
   - Configuración de Cloudinary (si se usan adjuntos).
3. Inicializar BBDD:
   - MySQL: ejecutar script SQL.
   - MongoDB: ejecutar `mongo-init.js`.
4. Lanzar backend con `yarn start:dev`.
5. Hacer login con el usuario seed `test@test.com / 12345678`.
6. Probar:
   - `/users`
   - `/conversations`
   - `/chat/message`
   - `/settings`
   - `/usage`.

Con esto el backend queda listo para integrarse con el frontend (widget, backoffice, etc.) o para ser desplegado en entornos de clientes (on-premise, cloud, multi-tenant, etc.).
