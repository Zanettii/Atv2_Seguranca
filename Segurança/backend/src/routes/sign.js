const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { decryptPrivateKey, hashText, signText } = require('../crypto/cryptoService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/sign  — sign a text
router.post('/', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'O campo "text" é obrigatório.' });
  }

  const db = getDb();
  const keyPair = db.prepare('SELECT * FROM key_pairs WHERE user_id = ?').get(req.userId);
  if (!keyPair) {
    return res.status(404).json({ error: 'Par de chaves não encontrado para este usuário.' });
  }

  try {
    const privateKey = decryptPrivateKey(keyPair.private_key_enc);
    const textHash = hashText(text);
    const signature = signText(text, privateKey);
    const sigId = uuidv4();

    db.prepare(
      'INSERT INTO signatures (id, user_id, text_content, text_hash, signature) VALUES (?, ?, ?, ?, ?)'
    ).run(sigId, req.userId, text, textHash, signature);

    return res.status(201).json({
      id: sigId,
      textHash,
      signature,
      algorithm: 'RSA-SHA256',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sign error:', err);
    return res.status(500).json({ error: 'Erro ao assinar o texto.' });
  }
});

// GET /api/sign — list user signatures
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const sigs = db
    .prepare(
      'SELECT id, text_content, text_hash, signature, algorithm, created_at FROM signatures WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(req.userId);
  return res.json({ signatures: sigs });
});

module.exports = router;
