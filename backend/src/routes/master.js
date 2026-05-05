const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { KARNATAKA_LOCATIONS } = require('../config/locations');

// GET /api/master/grains
router.get('/grains', async (req, res) => {
  try {
    const db = await getDb('grains');
    const result = await db.list({ include_docs: true });
    const grains = result.rows
      .filter(r => !r.id.startsWith('_design'))
      .map(r => r.doc);
    
    if (grains.length === 0) {
      // Return defaults if db is empty
      return res.json({ success: true, data: [
        { _id: 'wheat', name: 'Wheat', unit: 'kg', pricePerUnit: 2, reorderLevel: 500, currentStock: 1200 },
        { _id: 'rice', name: 'Rice', unit: 'kg', pricePerUnit: 3, reorderLevel: 500, currentStock: 900 },
        { _id: 'dal', name: 'Dal', unit: 'kg', pricePerUnit: 5, reorderLevel: 200, currentStock: 320 },
        { _id: 'jowar', name: 'Jowar', unit: 'kg', pricePerUnit: 2, reorderLevel: 200, currentStock: 150 },
      ]});
    }
    
    res.json({ success: true, data: grains });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/master/ration-cards
router.get('/ration-cards', async (req, res) => {
  try {
    const db = await getDb('ration_cards');
    const result = await db.list({ include_docs: true });
    const cards = result.rows
      .filter(r => !r.id.startsWith('_design'))
      .map(r => r.doc);
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/master/locations — Full Karnataka hierarchy
router.get('/locations', (req, res) => {
  res.json({ success: true, data: KARNATAKA_LOCATIONS });
});

// GET /api/master/locations/flat — Flat list of all villages with codes
router.get('/locations/flat', (req, res) => {
  const flat = [];
  KARNATAKA_LOCATIONS[0].districts.forEach(dist => {
    dist.taluks.forEach(taluk => {
      taluk.villages.forEach((village, vi) => {
        flat.push({
          code: `KA-${dist.code}-${taluk.code}-${String(vi + 1).padStart(3, '0')}`,
          state: 'Karnataka',
          district: dist.name,
          taluk: taluk.name,
          village
        });
      });
    });
  });
  res.json({ success: true, data: flat });
});

module.exports = router;
