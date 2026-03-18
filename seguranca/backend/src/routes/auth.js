const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { generateKeyPair, encryptPrivateKey } = require('../crypto/cryptoService');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email e password são obrigatórios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });
  }

  const db = getDb();
  try {
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username ou e-mail já cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const { publicKey, privateKey } = await generateKeyPair();
    const privateKeyEnc = encryptPrivateKey(privateKey);
    const keyId = uuidv4();

    const insertUser = db.prepare(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
    );
    const insertKey = db.prepare(
      'INSERT INTO key_pairs (id, user_id, public_key, private_key_enc) VALUES (?, ?, ?, ?)'
    );

    db.transaction(() => {
      insertUser.run(userId, username, email, passwordHash);
      insertKey.run(keyId, userId, publicKey, privateKeyEnc);
    })();

    const token = generateToken(userId);

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      token,
      user: { id: userId, username, email },
      publicKey,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = generateToken(user.id);
  const keyPair = db.prepare('SELECT public_key FROM key_pairs WHERE user_id = ?').get(user.id);

  return res.json({
    message: 'Login realizado com sucesso.',
    token,
    user: { id: user.id, username: user.username, email: user.email },
    publicKey: keyPair?.public_key || null,
  });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  const key = db.prepare('SELECT public_key, algorithm, key_size, created_at FROM key_pairs WHERE user_id = ?').get(req.userId);
  return res.json({ user, keyPair: key || null });
});

module.exports = router;
