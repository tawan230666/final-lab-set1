require('dotenv').config(); const express = require('express'); const cors = require('cors'); const { initDB } = require('./db/db'); const authRoutes = require('./routes/auth');
const app = express(); const PORT = process.env.PORT || 3001; app.use(cors()); app.use(express.json());
app.use('/api/auth', authRoutes); app.use((req, res) => res.status(404).json({ error: 'Not found' }));
async function start() { await initDB(); app.listen(PORT, () => { console.log(`[auth-service] running on port ${PORT}`); }); }
start().catch(err => { console.error('Failed to start auth-service:', err); process.exit(1); });
