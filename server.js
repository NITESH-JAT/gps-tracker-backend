const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const syncRoutes = require('./routes/syncRoutes');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors());

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', syncRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
});