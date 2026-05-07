const express = require('express');
const router = express.Router();
const { syncTripData, getMyTrips, getTripLocations } = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/syncTrip', requireAuth, syncTripData);
router.get('/myTrips', requireAuth, getMyTrips);
router.get('/tripLocations/:tripId', requireAuth, getTripLocations);

module.exports = router;