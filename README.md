# ia-backend
Backend nestJS para la IA entregable


## Quick Setup

Node.js (v18+ recomendable)
npm (o yarn/pnpm)
MySQL/MariaDB
ó 
MongoDB/Atlas

### Instalar dependencias
Desde la raíz del proyecto:

```
yarn
//o bien
npm install
```

### Configurar .env

Copia el ejemplo:

.env.example renombrado a .env

## Qué significa cada parametro del .env?
| Variable                  | Tipo / Ejemplo                                         | Descripción breve                                                    |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `NODE_ENV`                | `development` / `production`                           | Entorno de ejecución de NestJS (afecta logs, errores, etc.).         |
| `PORT`                    | `3000`                                                 | Puerto HTTP donde levanta el backend.                                |
| `ALLOWED_ORIGINS`         | `http://localhost:3000`                                | Orígenes permitidos para CORS (Frontend que puede llamar a la API).  |
| `APP_ID`                  | `dev-app`                                              | Identificador lógico de la instalación / tenant principal.           |
| `CHAT_AUTH_MODE`          | `none` | `local` | `oauth2`                            | Cómo se autentica el usuario **del chat** (widget).                  |
| `AUTH_STRATEGY`           | `none` | `api_key` | `oauth2`                          | Estrategia de auth global para el resto de endpoints internos.       |
| `INTERNAL_API_KEY`        | `mi_super_api_key_larga_1234`                          | API key para proteger endpoints cuando `AUTH_STRATEGY=api_key`.      |
| `JWT_SECRET`              | `super_secreto_dev_123456789`                          | Clave secreta para firmar los tokens JWT de login.                   |
| `JWT_EXPIRES_IN`          | `1h`                                                   | Tiempo de expiración del JWT (formato `ms`/`1h`/`24h`…).             |
| `DB_DRIVER`               | `mysql` | `mongodb`                                    | Tipo de base de datos que usará el backend.                          |
| `DB_URL`                  | `mysql://...` / `mongodb+srv://...`                    | URL de conexión principal a la base de datos.                        |
| `DB_HOST`                 | `localhost`                                            | Host del servidor de base de datos (para drivers SQL).               |
| `DB_PORT`                 | `3306`                                                 | Puerto de la base de datos.                                          |
| `DB_USER`                 | `root`                                                 | Usuario de la base de datos.                                         |
| `DB_PASSWORD`             | `root`                                                 | Password del usuario de la base de datos.                            |
| `DB_NAME`                 | `chatbot_db`                                           | Nombre de la base de datos usada por la app.                         |
| `DEFAULT_LLM_PROVIDER`    | `openai` | `grok` | `gemini` | `deepseek`              | Proveedor de IA por defecto.                                         |
| `DEFAULT_LLM_MODEL`       | `gpt-4o-mini`, `grok-4-latest`, `deepseek-chat`, etc.  | Modelo por defecto del proveedor elegido.                            |
| `DEFAULT_LLM_TEMPERATURE` | `0.2`                                                  | Temperatura por defecto (creatividad) de las respuestas del LLM.     |
| `DEFAULT_LLM_MAX_TOKENS`  | `200`                                                  | Máximo de tokens de salida por defecto para el LLM.                  |
| `OPENAI_API_KEY`          | `sk-...`                                               | API key de OpenAI.                                                   |
| `GEMINI_API_KEY`          | `AIza...`                                              | API key de Google Gemini.                                            |
| `GROK_API_KEY`            | `xai-...`                                              | API key de xAI / Grok.                                               |
| `DEEPSEEK_API_KEY`        | `sk-...`                                               | API key de DeepSeek.                                                 |
| `OPENAI_BASE_URL`         | `https://api.openai.com/v1`                            | URL base para la API de OpenAI (permite usar proxys/self-host/etc.). |
| `GEMINI_BASE_URL`         | `https://generativelanguage.googleapis.com/v1beta`     | URL base para API de Gemini.                                         |
| `GROK_BASE_URL`           | `https://api.x.ai/v1`                                  | URL base para API de Grok.                                           |
| `DEEPSEEK_BASE_URL`       | `https://api.deepseek.com/v1`                          | URL base para API de DeepSeek.                                       |
| `HTTP_PROXY`              | `http://proxy.local:3128`                              | Proxy HTTP corporativo (si existe).                                  |
| `HTTPS_PROXY`             | `http://proxy.local:3128`                              | Proxy HTTPS corporativo (si existe).                                 |
| `LOG_LEVEL`               | `info` | `debug` | `warn` | `error`                    | Nivel de detalle de logging de la aplicación.                        |
| `HTTP_LOGGING_ENABLED`    | `true` / `false`                                       | Activa/desactiva logs HTTP de las peticiones.                        |
| `METRICS_ENABLED`         | `true` / `false`                                       | Activa el servidor de métricas (Prometheus, etc.).                   |
| `METRICS_PORT`            | `9100`                                                 | Puerto donde se exponen las métricas (si está activado).             |
| `STORAGE_PROVIDER`        | `cloudinary` | `s3` | `local`                          | Proveedor de almacenamiento de adjuntos.                             |
| `CLOUDINARY_CLOUD_NAME`   | `dazfoa93m`                                            | Nombre del “Cloud” en Cloudinary.                                    |
| `CLOUDINARY_API_KEY`      | `3138569...`                                           | API key de Cloudinary.                                               |
| `CLOUDINARY_API_SECRET`   | `xxxx`                                                 | API secret de Cloudinary.                                            |
| `S3_ENDPOINT`             | `https://s3.amazonaws.com` / `http://minio.local:9000` | Endpoint para S3 o MinIO (si se usa `STORAGE_PROVIDER=s3`).          |
| `S3_REGION`               | `eu-west-1`                                            | Región del bucket S3.                                                |
| `S3_BUCKET`               | `mi-bucket-chatbot`                                    | Nombre del bucket donde se guardan los adjuntos.                     |
| `S3_ACCESS_KEY_ID`        | `AKIA...`                                              | Access key para S3 / MinIO.                                          |
| `S3_SECRET_ACCESS_KEY`    | `xxxx`                                                 | Secret key para S3 / MinIO.                                          |


### Opción A: MySQL 

Para desarrollo con MySQL:

NODE_ENV=development
PORT=3000
APP_ID=dev-app
CHAT_AUTH_MODE=local
AUTH_STRATEGY=none
JWT_SECRET=super_secreto_dev_123456789
JWT_EXPIRES_IN=1h

DB_DRIVER=mysql
DB_URL=mysql://chatbot_user:chatbot_pass@localhost:3306/chatbot_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=chatbot_db

DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o-mini
DEFAULT_LLM_TEMPERATURE=0.2
DEFAULT_LLM_MAX_TOKENS=200


Crear BBDD vacía:

```
CREATE DATABASE chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Importar el script SQL db/chatbot_db.sql:

```
mysql -u root -p chatbot_db < db/chatbot_db.sql
```

Ese script ya crea:

tablas users, conversations, messages, settings, usage

y un usuario de prueba:

email: test@test.com
password: 12345678


### Opción B: MongoDB 

En .env cambia:

DB_DRIVER=mongodb
DB_URL=mongodb+srv://usuario:password@cluster-url/chatbot_db


Ejecuta el script de inicialización:
```
mongosh "mongodb+srv://usuario:password@cluster-url/chatbot_db" db/mongo-init.js
```

Ese script:

Crea colecciones users, conversations, messages, settings, usage

Inserta el usuario seed test@test.com / 12345678

## Levantar el backend

Modo desarrollo (watch):
```
yarn start:dev
```

El backend quedará en:

http://localhost:3000


### Generar el hash de contraseña para el super admin del backoffice

El super admin del backoffice utiliza contraseñas almacenadas con **bcrypt**.  
Para crear o cambiar la contraseña, puedes usar el script `generar-hash.ts`.

#### 1. Requisitos

Asegúrate de tener instalados:

```bash
yarn add bcrypt
yarn add -D ts-node typescript
# o con npm:
# npm install bcrypt
# npm install --save-dev ts-node typescript


-----------------------------------------------------------
## Documentación de instalación

Para ver las instrucciones detalladas de setup, consulta:

➡️ [INSTRUCCIONES de instalación](./INSTRUCCIONES.md)