require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/db');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`[user-service] running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start user-service:', err);
  process.exit(1);
});
