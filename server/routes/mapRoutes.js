const express = require('express');
const router = express.Router();
const { searchLocation } = require('../controllers/mapController');

// GET /api/map/search?q=location
router.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }
  try {
    const result = await searchLocation(query);
    if (!result) return res.status(404).json({ error: 'Location not found' });
    res.json(result);
  } catch (err) {
    console.warn('Map search route error:', err.message);
    res.status(500).json({ error: 'Map search failed' });
  }
});

module.exports = router;
