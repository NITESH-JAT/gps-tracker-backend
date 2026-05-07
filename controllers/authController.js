const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const loginWithGoogle = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }

    try {

        const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture: avatarUrl } = payload;

        const upsertQuery = `
        INSERT INTO users (google_id, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, google_id =     EXCLUDED.google_id
        RETURNING id, email, name, avatar_url;
        `;

        const result = await pool.query(upsertQuery, [googleId, email, name, avatarUrl]);
        const user = result.rows[0];

        const authToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
        );

        res.status(200).json({
        success: true,
        token: authToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar_url
        }
        });

    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(401).json({ success: false, message: 'Google authentication failed' });
    }
};

module.exports = { loginWithGoogle };