const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '../../init.sql')).toString();
  try {
    await pool.query(sql);
    console.log('[task-db] Tables initialized');
  } catch (err) {
    console.error('[task-db] Init error:', err);
  }
}

module.exports = { pool, initDB };
