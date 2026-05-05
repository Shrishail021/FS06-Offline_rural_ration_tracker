const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Sync endpoint for offline PouchDB transactions
router.post('/', async (req, res) => {
  const { deviceId, transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ success: false, message: 'Invalid transactions format' });
  }

  const results = {
    synced: 0,
    failed: 0,
    errors: []
  };

  try {
    for (const tx of transactions) {
      try {
        // Here we would normally validate and insert into Postgres distributions table
        // Example logic:
        // await db.query(
        //   `INSERT INTO distributions (transaction_id, device_id, ration_card_id, grain_type, quantity, distribution_date, sync_status) 
        //    VALUES ($1, $2, $3, $4, $5, $6, 'SYNCED') ON CONFLICT (transaction_id) DO NOTHING`,
        //   [tx._id, deviceId, tx.rationCardId, tx.grainType, tx.quantity, tx.timestamp]
        // );
        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push({ id: tx._id, error: err.message });
      }
    }

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ success: false, message: 'Server error during synchronization' });
  }
});

// Endpoint to fetch master data for offline caching
router.get('/master-data', async (req, res) => {
  try {
    // Mock response for master data
    res.json({
      success: true,
      rationCards: [
        { id: 'RC-001', headName: 'Rajesh Kumar Sharma', status: 'ACTIVE', members: [
          { name: 'Rajesh Kumar Sharma', age: 45, aadhaar: 'XXXX-XXXX-1234' }
        ]}
      ],
      grains: ['wheat', 'rice', 'dal', 'jowar']
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching master data' });
  }
});

module.exports = router;
