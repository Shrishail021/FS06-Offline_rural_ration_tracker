const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');

// GET /api/logistics/shipments
router.get('/shipments', async (req, res) => {
  try {
    const db = await getDb('shipments');
    const result = await db.list({ include_docs: true, descending: true });
    const shipments = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    res.json({ success: true, data: shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/logistics/shipments — Create new shipment
router.post('/shipments', async (req, res) => {
  const { grainType, quantity, fromLocation, toVillage, toDistrict, deliveryDate, notes } = req.body;
  if (!grainType || !quantity || !toVillage) {
    return res.status(400).json({ success: false, message: 'Grain, quantity and village required' });
  }
  try {
    const db = await getDb('shipments');
    const grainsDb = await getDb('grains');
    
    // Deduct stock
    try {
      const grainDoc = await grainsDb.get(grainType);
      if ((grainDoc.currentStock || 0) < Number(quantity)) {
        return res.status(400).json({ success: false, message: 'Insufficient stock available.' });
      }
      grainDoc.currentStock -= Number(quantity);
      await grainsDb.insert(grainDoc);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid grain type or stock not found.' });
    }

    const doc = {
      _id: req.body._id || `ship_${Date.now()}`,
      grainType, quantity: Number(quantity), fromLocation,
      toVillage, toDistrict, deliveryDate,
      notes, status: 'PENDING',
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.insert(doc);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/logistics/shipments/:id — Update status
router.put('/shipments/:id', async (req, res) => {
  try {
    const db = await getDb('shipments');
    const doc = await db.get(req.params.id);
    const { status, deliveryDate, notes } = req.body;
    if (status) doc.status = status;
    if (deliveryDate) doc.deliveryDate = deliveryDate;
    if (notes) doc.notes = notes;
    doc.updatedAt = new Date().toISOString();
    await db.insert(doc);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/logistics/by-village/:village — Distribution stats per village
router.get('/by-village/:village', async (req, res) => {
  try {
    const distDb = await getDb('distributions');
    const result = await distDb.list({ include_docs: true });
    const village = decodeURIComponent(req.params.village);
    const dists = result.rows
      .filter(r => !r.id.startsWith('_design') && r.doc.village === village)
      .map(r => r.doc);
    const totalQty = dists.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
    const grainBreakdown = {};
    dists.forEach(d => {
      const g = d.grainType || 'unknown';
      grainBreakdown[g] = (grainBreakdown[g] || 0) + (Number(d.quantity) || 0);
    });
    res.json({ success: true, data: { village, totalTransactions: dists.length, totalQuantityKg: totalQty, grainBreakdown } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
