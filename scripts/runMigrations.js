const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('[MIGRATION] Starting database migration...');
        const sqlPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
        const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sqlQuery);
        console.log('[MIGRATION] Schema updated successfully.');
    } catch (error) {
        console.error('[MIGRATION ERROR]', error);
    } finally {
        client.release();
        process.exit(0);
    }
};

runMigrations();