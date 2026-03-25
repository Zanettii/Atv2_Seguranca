const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifySignature } = require('../crypto/cryptoService');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const sig = db
    .prepare(
      `SELECT s.*, u.username, u.email, kp.public_key, kp.algorithm AS key_algorithm
       FROM signatures s
       JOIN users u ON s.user_id = u.id
       JOIN key_pairs kp ON kp.user_id = u.id
       WHERE s.id = ?`
    )
    .get(id);

  if (!sig) {
    return res.status(404).json({ error: 'Assinatura não encontrada.' });
  }

  const isValid = verifySignature(sig.text_content, sig.signature, sig.public_key);
  const result = isValid ? 'VALID' : 'INVALID';

  db.prepare(
    'INSERT INTO verification_logs (id, signature_id, result, ip_address, method) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), id, result, getClientIp(req), 'by_id');

  return res.json({
    result,
    signatureId: sig.id,
    signer: { username: sig.username, email: sig.email },
    algorithm: sig.algorithm,
    textHash: sig.text_hash,
    createdAt: sig.created_at,
    publicKey: sig.public_key,
    signatureBase64: sig.signature,
    ...(result === 'VALID' && { textContent: sig.text_content }),
  });
});

router.post('/', (req, res) => {
  const { text, signature, publicKey } = req.body;
  if (!text || !signature || !publicKey) {
    return res.status(400).json({ error: 'text, signature e publicKey são obrigatórios.' });
  }

  const isValid = verifySignature(text, signature, publicKey);
  const result = isValid ? 'VALID' : 'INVALID';

  const db = getDb();
  db.prepare(
    'INSERT INTO verification_logs (id, signature_id, result, ip_address, method, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), null, result, getClientIp(req), 'manual', JSON.stringify({ textLength: text.length }));

  return res.json({
    result,
    algorithm: 'RSA-SHA256',
    verifiedAt: new Date().toISOString(),
  });
});

module.exports = router;
