// controllers/syncController.js
const { pool } = require('../config/db');

const syncTripData = async (req, res) => {
    const { trip, locationBatch } = req.body;
    const userId = req.userId;

    if (!trip || !trip.id || !locationBatch || !Array.isArray(locationBatch)) {
        return res.status(400).json({ success: false, message: 'Invalid payload: Missing trip or locations' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tripQuery = `
        INSERT INTO trips (id, user_id, start_time, end_time, total_distance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET end_time = EXCLUDED.end_time, total_distance = EXCLUDED.total_distance;
        `;
        await client.query(tripQuery, [
        trip.id,
        userId,
        trip.startTime,
        trip.endTime || null,
        trip.totalDistance || 0
        ]);

        // location to be synced
        if (locationBatch.length > 0) {
        const query = `
            INSERT INTO locations (latitude, longitude, timestamp, accuracy, trip_id, user_id)
            SELECT * FROM UNNEST ($1::float[], $2::float[], $3::timestamptz[], $4::float[], $5::text[], $6::int[])
        `;

        const lats = locationBatch.map(l => l.latitude);
        const lngs = locationBatch.map(l => l.longitude);
        const times = locationBatch.map(l => l.timestamp);
        const accs = locationBatch.map(l => l.accuracy);
        const tripIds = locationBatch.map(() => trip.id);
        const userIds = locationBatch.map(() => userId);

        await client.query(query, [lats, lngs, times, accs, tripIds, userIds]);
        }

        await client.query('COMMIT');

        console.log(`[SYNC] Trip ${trip.id} synced with ${locationBatch.length} points.`);
        res.status(200).json({ success: true, syncedCount: locationBatch.length });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[SYNC ERROR]', error);
        res.status(500).json({ success: false, message: 'Database sync failed' });
    } finally {
        client.release();
    }
    };

    const getMyTrips = async (req, res) => {
    const userId = req.userId;
    try {
        const result = await pool.query(
        'SELECT * FROM trips WHERE user_id = $1 ORDER BY start_time DESC',
        [userId]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
    };

    // fetch locations for a trip
    const getTripLocations = async (req, res) => {
    const { tripId } = req.params;
    const userId = req.userId;
    try {
        const result = await pool.query(
        'SELECT latitude, longitude, timestamp FROM locations WHERE trip_id = $1 AND user_id = $2 ORDER BY timestamp ASC',
        [tripId, userId]
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { syncTripData, getMyTrips, getTripLocations };