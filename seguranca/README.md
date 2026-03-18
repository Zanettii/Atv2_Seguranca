# Assinatura Digital — Web Application

Uma aplicação web completa para **criação e verificação de assinaturas digitais**, construída com RSA-2048 + SHA-256. O objetivo é oferecer uma forma segura e simples de assinar textos digitalmente e permitir que qualquer pessoa verifique a autenticidade dessas assinaturas.

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

Aqui está um resumo do que a aplicação é capaz de fazer:

| Funcionalidade | Detalhe |
|---|---|
| Cadastro | Gera um par de chaves RSA-2048; a chave privada é armazenada de forma criptografada (AES-256-GCM) |
| Login | Autenticação via JWT com validade de 24 horas |
| Assinatura | Gera o hash SHA-256 do texto e assina com RSA; tanto a assinatura quanto os dados são persistidos |
| Verificação pública | Pode ser feita por ID ou colando o texto, a assinatura e a chave pública manualmente |
| Logs | Cada verificação é registrada com o resultado, o IP de origem e o momento exato da consulta |

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

A aplicação é dividida em dois serviços independentes que se comunicam via HTTP:

- **Frontend:** React 18, React Router v6, Vite 5
- **Backend:** Node.js 20, Express 4, better-sqlite3
- **Crypto:** módulo `crypto` nativo do Node.js (RSA-2048, SHA-256, AES-256-GCM)
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Testes:** Jest + Supertest

---

## Como Rodar

### Docker Compose (recomendado)

A maneira mais rápida de subir tudo de uma vez:

```bash
docker compose up --build
```

Depois de alguns instantes, os serviços estarão disponíveis em:

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3001

### Desenvolvimento Local

**Pré-requisitos:** Node.js versão 20 ou superior.

#### Backend

```bash
cd backend
cp .env.example .env   # ajuste os secrets conforme necessário
npm install
npm run dev            # sobe em http://localhost:3001
```

#### Frontend

```bash
cd frontend
npm install
npm run dev            # sobe em http://localhost:5173
```

#### Testes

```bash
cd backend
npm test
```

---

## Banco de Dados

O banco é criado automaticamente na primeira execução, em `backend/data/signatures.db`. O schema completo é o seguinte:

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
  private_key_enc TEXT NOT NULL,          -- PEM criptografado com AES-256-GCM
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
  text_hash    TEXT NOT NULL,   -- hash SHA-256 do texto em hex
  signature    TEXT NOT NULL,   -- assinatura RSA em base64
  algorithm    TEXT NOT NULL DEFAULT 'RSA-SHA256',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Logs de verificação
CREATE TABLE verification_logs (
  id           TEXT PRIMARY KEY,
  signature_id TEXT,            -- NULL quando a verificação for manual
  result       TEXT NOT NULL CHECK(result IN ('VALID', 'INVALID')),
  verified_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address   TEXT,
  method       TEXT NOT NULL DEFAULT 'by_id',
  details      TEXT            -- JSON com informações extras (verificação manual)
);
```

---

## Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | Cadastra o usuário e gera suas chaves |
| `POST` | `/api/auth/login` | Realiza o login |
| `GET`  | `/api/auth/me` | Retorna os dados do usuário autenticado |

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

### Assinatura

> Todos os endpoints abaixo exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/sign` | Assina um texto |
| `GET`  | `/api/sign` | Lista as assinaturas do usuário autenticado |

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

### Verificação

Este conjunto de endpoints é público — qualquer pessoa pode verificar uma assinatura, sem precisar estar autenticada.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/api/verify/:id` | Verifica uma assinatura pelo seu ID |
| `POST` | `/api/verify` | Verifica colando o texto, a assinatura e a chave pública |

#### GET /api/verify/:id

**Response 200 (assinatura válida):**
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

**Response 200 (assinatura inválida):**
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

Abaixo estão os fluxos principais da aplicação, mostrando a comunicação entre cliente, backend e banco de dados.

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

Os testes ficam em `backend/tests/app.test.js` e cobrem os cenários mais importantes da aplicação:

| # | Tipo | Descrição | Resultado esperado |
|---|------|-----------|-------------------|
| 1 | ✅ Positivo | `GET /api/verify/:id` — assinatura não alterada | `"result": "VALID"` |
| 2 | ❌ Negativo | `POST /api/verify` — texto adulterado (sufixo adicionado) | `"result": "INVALID"` |
| 3 | ❌ Negativo | `POST /api/verify` — assinatura base64 corrompida | `"result": "INVALID"` |
| 4 | — | Tentativa de cadastro duplicado | HTTP 409 |
| 5 | — | Login com senha incorreta | HTTP 401 |
| 6 | — | Tentativa de assinar sem token | HTTP 401 |
| 7 | — | Verificação de ID inexistente | HTTP 404 |

Para rodar os testes:

```bash
cd backend && npm test
```

---

## Segurança

Alguns pontos importantes sobre como a aplicação lida com dados sensíveis:

- A **chave privada** nunca trafega pela rede. Ela é armazenada criptografada com AES-256-GCM, usando um segredo definido no servidor.
- As **senhas** são armazenadas com bcrypt, usando custo 12.
- Os **tokens JWT** expiram em 24 horas.
- O **CORS** está configurado para aceitar requisições apenas da URL do frontend.
- Em produção, lembre-se de substituir `JWT_SECRET` e `SERVER_SECRET` por valores aleatórios fortes, com pelo menos 32 bytes cada.