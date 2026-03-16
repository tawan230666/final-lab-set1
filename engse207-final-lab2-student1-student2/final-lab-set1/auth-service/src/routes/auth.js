const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken, verifyToken } = require('../middleware/jwtUtils');
const router = express.Router();

const DUMMY_BCRYPT_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8y0R6VQwWi4KFOeFHrgb3R04QLbL7a';

async function logEvent({ service='auth-service', level, event, userId, ip, method, path, statusCode, message, meta }) {
  try {
    await fetch('http://log-service:3003/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, level, event, user_id: userId, ip_address: ip,
        method, path, status_code: statusCode, message, meta })
    });
  } catch (_) {}
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-real-ip'] || req.ip;
  if (!email || !password) return res.status(400).json({ error: 'กรุณากรอก email และ password' });
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const result = await pool.query('SELECT id, username, email, password_hash, role FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0] || null;
    const passwordHash = user ? user.password_hash : DUMMY_BCRYPT_HASH;
    const isValid = await bcrypt.compare(password, passwordHash);
    if (!user || !isValid) {
      await logEvent({ level: 'WARN', event: 'LOGIN_FAILED', userId: user?.id || null, ip,
        method: 'POST', path: '/api/auth/login', statusCode: 401, message: `Login failed for: ${normalizedEmail}` });
      return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
    }
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });
    await logEvent({ level: 'INFO', event: 'LOGIN_SUCCESS', userId: user.id, ip,
      method: 'POST', path: '/api/auth/login', statusCode: 200, message: `User ${user.username} logged in` });
    res.json({ message: 'Login สำเร็จ', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    await logEvent({ level: 'ERROR', event: 'LOGIN_ERROR', ip,
      method: 'POST', path: '/api/auth/login', statusCode: 500, message: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try { const decoded = verifyToken(token); res.json({ valid: true, user: decoded }); }
  catch (err) { res.status(401).json({ valid: false, error: err.message }); }
});

router.get('/me', async (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const result = await pool.query('SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1', [decoded.sub]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

router.get('/health', (_, res) => res.json({ status: 'ok', service: 'auth-service' }));

module.exports = router;
