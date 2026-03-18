process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.SERVER_SECRET = 'test-server-secret-32bytes-padding';

const request = require('supertest');
const app = require('../src/index');
const { closeDb } = require('../src/db/database');

let token;
let signatureId;
let publicKey;
let originalSignature;
let originalText;

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({
    username: 'testuser',
    email: 'test@example.com',
    password: 'senha123',
  });
  expect(res.status).toBe(201);
  token = res.body.token;
  publicKey = res.body.publicKey;
}, 15000);

afterAll(() => {
  closeDb();
});

describe('Auth', () => {
  test('Register should return token and publicKey', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'outro',
      email: 'outro@example.com',
      password: 'abc123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.publicKey).toMatch(/BEGIN PUBLIC KEY/);
  }, 15000);

  test('Login should succeed with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'senha123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('Login should fail with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  test('Duplicate registration should fail', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'senha123',
    });
    expect(res.status).toBe(409);
  });
});

describe('Signing', () => {
  test('Should sign text and return signatureId', async () => {
    originalText = 'Este é o texto que vou assinar digitalmente.';
    const res = await request(app)
      .post('/api/sign')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: originalText });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.signature).toBeDefined();
    expect(res.body.textHash).toBeDefined();
    signatureId = res.body.id;
    originalSignature = res.body.signature;
  });

  test('Should require authentication to sign', async () => {
    const res = await request(app).post('/api/sign').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  test('Should reject empty text', async () => {
    const res = await request(app)
      .post('/api/sign')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('Verification — Positive case', () => {
  test('GET /api/verify/:id should return VALID for untampered signature', async () => {
    const res = await request(app).get(`/api/verify/${signatureId}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('VALID');
    expect(res.body.signer.username).toBe('testuser');
    expect(res.body.algorithm).toBe('RSA-SHA256');
    expect(res.body.textContent).toBe(originalText);
  });
});

describe('Verification — Negative case', () => {
  test('POST /api/verify with tampered text should return INVALID', async () => {
    const tamperedText = originalText + ' [ADULTERADO]';
    const res = await request(app).post('/api/verify').send({
      text: tamperedText,
      signature: originalSignature,
      publicKey,
    });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('INVALID');
  });

  test('POST /api/verify with tampered signature should return INVALID', async () => {
    const tamperedSig = originalSignature.slice(0, -4) + 'ZZZZ';
    const res = await request(app).post('/api/verify').send({
      text: originalText,
      signature: tamperedSig,
      publicKey,
    });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('INVALID');
  });

  test('GET /api/verify/:id with unknown ID should return 404', async () => {
    const res = await request(app).get('/api/verify/non-existent-id');
    expect(res.status).toBe(404);
  });
});

describe('Verification Logs', () => {
  test('Verifications should be logged (verify was called above)', async () => {
    const res = await request(app).get(`/api/verify/${signatureId}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('VALID');
  });
});
