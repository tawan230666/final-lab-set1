require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db/db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  let retries = 10;
  while (retries) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) { console.log(`Waiting for DB... (${retries})`); retries--; await new Promise(r => setTimeout(r, 3000)); }
  }
  app.listen(PORT, () => console.log(`[auth-service] running on ${PORT}`));
}
start();
