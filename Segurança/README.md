# Assinatura Digital — Web Application

Aplicação web completa para **criação e verificação de assinaturas digitais** usando RSA-2048 + SHA-256.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Como Rodar](#como-rodar)
  - [Docker Compose (recomendado)](#docker-compose-recomendado)
  - [Desenvolvimento Local](#desenvolvimento-local)
- [Banco de Dados](#banco-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Fluxos](#fluxos)
- [Casos de Teste](#casos-de-teste)

---

## Visão Geral

| Funcionalidade | Detalhe |
|---|---|
| Cadastro | Gera par de chaves RSA-2048; chave privada armazenada criptografada (AES-256-GCM) |
| Login | JWT (24 h) |
| Assinatura | SHA-256 do texto + RSA sign; assinatura e dados persistidos |
| Verificação pública | Por ID ou colando texto + assinatura + chave pública |
| Logs | Cada verificação é persistida com resultado, IP e timestamp |

---

## Arquitetura

```
┌───────────────┐        HTTP/REST        ┌────────────────────┐
│   Frontend    │ ──────────────────────► │     Backend        │
│  React + Vite │ ◄────────────────────── │  Express + SQLite  │
└───────────────┘                         └────────┬───────────┘
                                                   │
                                          ┌────────▼───────────┐
                                          │  SQLite Database   │
                                          │  signatures.db     │
                                          └────────────────────┘
```

**Stack:**
- **Frontend:** React 18, React Router v6, Vite 5
- **Backend:** Node.js 20, Express 4, better-sqlite3
- **Crypto:** Node.js built-in `crypto` (RSA-2048, SHA-256, AES-256-GCM)
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Testes:** Jest + Supertest

---

## Como Rodar

### Docker Compose (recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001

### Desenvolvimento Local

**Pré-requisitos:** Node.js ≥ 20

#### Backend

```bash
cd backend
cp .env.example .env   # ajuste os secrets se necessário
npm install
npm run dev            # http://localhost:3001
```

#### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

#### Testes

```bash
cd backend
npm test
```

---

## Banco de Dados

### Schema (SQLite)

```sql
-- Usuários
CREATE TABLE users (
  id          TEXT PRIMARY KEY,      -- UUID v4
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pares de chaves RSA
CREATE TABLE key_pairs (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,          -- PEM SPKI
  private_key_enc TEXT NOT NULL,          -- AES-256-GCM encrypted PEM
  algorithm       TEXT NOT NULL DEFAULT 'RSA-SHA256',
  key_size        INTEGER NOT NULL DEFAULT 2048,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assinaturas
CREATE TABLE signatures (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  text_content TEXT NOT NULL,
  text_hash    TEXT NOT NULL,   -- SHA-256 hex do texto
  signature    TEXT NOT NULL,   -- RSA signature em base64
  algorithm    TEXT NOT NULL DEFAULT 'RSA-SHA256',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Logs de verificação
CREATE TABLE verification_logs (
  id           TEXT PRIMARY KEY,
  signature_id TEXT,            -- NULL para verificação manual
  result       TEXT NOT NULL CHECK(result IN ('VALID', 'INVALID')),
  verified_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address   TEXT,
  method       TEXT NOT NULL DEFAULT 'by_id',
  details      TEXT            -- JSON extra (verificação manual)
);
```

O banco é criado automaticamente na primeira execução em `backend/data/signatures.db`.

---

## Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | Cadastro + geração de chaves |
| `POST` | `/api/auth/login` | Login |
| `GET`  | `/api/auth/me` | Dados do usuário autenticado |

#### POST /api/auth/register

**Request:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "senha123"
}
```

**Response 201:**
```json
{
  "message": "Usuário cadastrado com sucesso.",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "uuid", "username": "alice", "email": "alice@example.com" },
  "publicKey": "-----BEGIN PUBLIC KEY-----\n..."
}
```

#### POST /api/auth/login

**Request:**
```json
{ "username": "alice", "password": "senha123" }
```

**Response 200:**
```json
{ "token": "...", "user": { ... }, "publicKey": "-----BEGIN PUBLIC KEY-----\n..." }
```

---

### Assinatura (requer `Authorization: Bearer <token>`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/sign` | Assinar um texto |
| `GET`  | `/api/sign` | Listar assinaturas do usuário |

#### POST /api/sign

**Request:**
```json
{ "text": "Este é o texto a ser assinado." }
```

**Response 201:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "textHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "signature": "base64encodedSignature==",
  "algorithm": "RSA-SHA256",
  "createdAt": "2026-03-17T10:00:00.000Z"
}
```

---

### Verificação (pública)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/api/verify/:id` | Verificar por ID da assinatura |
| `POST` | `/api/verify` | Verificar colando texto + assinatura + chave pública |

#### GET /api/verify/:id

**Response 200 (VALID):**
```json
{
  "result": "VALID",
  "signatureId": "3fa85f64-...",
  "signer": { "username": "alice", "email": "alice@example.com" },
  "algorithm": "RSA-SHA256",
  "textHash": "a665...",
  "createdAt": "2026-03-17T10:00:00.000Z",
  "textContent": "Este é o texto a ser assinado."
}
```

**Response 200 (INVALID):**
```json
{ "result": "INVALID", "signatureId": "...", ... }
```

#### POST /api/verify

**Request:**
```json
{
  "text": "Este é o texto a ser assinado.",
  "signature": "base64encodedSignature==",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n..."
}
```

**Response 200:**
```json
{ "result": "VALID", "algorithm": "RSA-SHA256", "verifiedAt": "2026-03-17T10:00:00.000Z" }
```

---

## Fluxos

### Fluxo de Cadastro
```
Cliente                          Backend                       BD
  |──POST /register──────────────►|                            |
  |                               |── bcrypt hash ─────────────|
  |                               |── generateKeyPair() ───────|
  |                               |── encryptPrivateKey() ─────|
  |                               |── INSERT users ────────────►|
  |                               |── INSERT key_pairs ─────────►|
  |◄── 201 { token, publicKey } ──|                            |
```

### Fluxo de Assinatura
```
Cliente                          Backend                       BD
  |──POST /sign ─────────────────►|                            |
  |  { text }                     |── SELECT key_pairs ─────────►|
  |                               |── decryptPrivateKey()      |
  |                               |── hashText(text) sha-256   |
  |                               |── signText(text, privKey)  |
  |                               |── INSERT signatures ────────►|
  |◄── 201 { id, sig, hash } ─────|                            |
```

### Fluxo de Verificação
```
Qualquer Cliente                 Backend                       BD
  |──GET /verify/:id ────────────►|                            |
  |                               |── SELECT sig + pubKey ──────►|
  |                               |── verifySignature()        |
  |                               |── INSERT verification_log ──►|
  |◄── 200 { VALID/INVALID } ─────|                            |
```

---

## Casos de Teste

Os testes estão em `backend/tests/app.test.js` e cobrem:

| # | Tipo | Descrição | Resultado esperado |
|---|------|-----------|-------------------|
| 1 | ✅ Positivo | `GET /api/verify/:id` — assinatura não alterada | `"result": "VALID"` |
| 2 | ❌ Negativo | `POST /api/verify` — texto adulterado (sufixo adicionado) | `"result": "INVALID"` |
| 3 | ❌ Negativo | `POST /api/verify` — assinatura base64 corrompida | `"result": "INVALID"` |
| 4 | — | Cadastro duplicado | HTTP 409 |
| 5 | — | Login com senha errada | HTTP 401 |
| 6 | — | Assinar sem token | HTTP 401 |
| 7 | — | Verificar ID inexistente | HTTP 404 |

```bash
cd backend && npm test
```

---

## Segurança

- **Chave privada** nunca trafega pela rede; é armazenada criptografada com AES-256-GCM usando um segredo de servidor.
- **Senhas** armazenadas com bcrypt (custo 12).
- **JWT** com expiração de 24 h.
- **CORS** restrito à URL do frontend.
- Em produção, substitua `JWT_SECRET` e `SERVER_SECRET` por valores aleatórios fortes (≥ 32 bytes).
