require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/db');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`[task-service] running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start task-service:', err);
  process.exit(1);
});
