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

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'task-service' }));

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user.sub;
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, description, status, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const userId = req.user.sub;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, description, status, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title, description || '', status || 'TODO', priority || 'medium']
    );
    const task = result.rows[0];
    await logEvent('INFO', 'TASK_CREATED', userId, `Task "${title}" created`, { task_id: task.id });
    res.status(201).json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;
  const userId = req.user.sub;
  try {
    const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskCheck.rows[0];
    if (task.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await pool.query(
      `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), priority = COALESCE($4, priority), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title, description, status, priority, id]
    );
    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;
  try {
    const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskCheck.rows[0];
    if (task.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    await logEvent('INFO', 'TASK_DELETED', userId, `Task ${id} deleted`);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
