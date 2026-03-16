const express = require('express');
const { pool } = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');
const router = express.Router();

async function logEvent(level, event, userId, message, meta = {}) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1, $2, $3, $4, $5)',
      [level, event, userId, message, JSON.stringify(meta)]
    );
  } catch (err) {}
}

// Ensure profile exists for the user (using data from JWT)
async function ensureProfile(userId, username, email, role) {
  const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    await pool.query(
      'INSERT INTO user_profiles (user_id, username, email, role, display_name) VALUES ($1, $2, $3, $4, $5)',
      [userId, username, email, role, username]
    );
    await logEvent('INFO', 'PROFILE_CREATED', userId, `Profile auto-created for user ${userId}`);
  }
}

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// All endpoints except health require JWT
router.use(requireAuth);

// GET /api/users/me
router.get('/me', async (req, res) => {
  const { sub: userId, username, email, role } = req.user;
  try {
    await ensureProfile(userId, username, email, role);
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/me
router.put('/me', async (req, res) => {
  const { sub: userId, username, email, role } = req.user;
  const { display_name, bio, avatar_url } = req.body;
  try {
    await ensureProfile(userId, username, email, role);
    const result = await pool.query(
      `UPDATE user_profiles SET
        display_name = COALESCE($1, display_name),
        bio = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url),
        updated_at = NOW()
       WHERE user_id = $4 RETURNING *`,
      [display_name, bio, avatar_url, userId]
    );
    await logEvent('INFO', 'PROFILE_UPDATED', userId, `User ${userId} updated profile`);
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users (admin only)
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  try {
    const result = await pool.query('SELECT * FROM user_profiles ORDER BY id');
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
