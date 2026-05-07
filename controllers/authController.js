const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const register = async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const result = await pool.query(
        'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, name || 'GPS User', hashedPassword]
        );
        const user = result.rows[0];

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ success: true, token, user });
    } catch (error) {

        if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
    };

    const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }


        const isMatch = await bcrypt.compare(password, user.google_id); // Reading the hash from google_id
        if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }


        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name }
        });
    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { register, login };