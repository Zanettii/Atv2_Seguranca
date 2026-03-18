const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SERVER_SECRET = process.env.SERVER_SECRET || 'default-dev-secret-change-in-production-32b';

function deriveKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      },
      (err, publicKey, privateKey) => {
        if (err) return reject(err);
        resolve({ publicKey, privateKey });
      }
    );
  });
}

function encryptPrivateKey(privateKeyPem) {
  const key = deriveKey(SERVER_SECRET);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
}

function decryptPrivateKey(encryptedBase64) {
  const key = deriveKey(SERVER_SECRET);
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.slice(0, 12);
  const authTag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function hashText(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function signText(text, privateKeyPem) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(text, 'utf8');
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

function verifySignature(text, signatureBase64, publicKeyPem) {
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(text, 'utf8');
    verify.end();
    return verify.verify(publicKeyPem, signatureBase64, 'base64');
  } catch {
    return false;
  }
}

module.exports = {
  generateKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  hashText,
  signText,
  verifySignature,
};
