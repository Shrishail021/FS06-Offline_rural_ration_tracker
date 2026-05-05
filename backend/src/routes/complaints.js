const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');

// GET /api/complaints — Admin: all complaints
router.get('/', async (req, res) => {
  try {
    const db = await getDb('complaints');
    const result = await db.list({ include_docs: true, descending: true });
    const complaints = result.rows
      .filter(r => !r.id.startsWith('_design'))
      .map(r => r.doc);
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints — Create (from distributor)
router.post('/', async (req, res) => {
  const doc = req.body;
  
  if (!doc.type) {
    return res.status(400).json({ success: false, message: 'Type is required' });
  }

  try {
    const db = await getDb('complaints');
    
    // Check if it already exists
    try {
      const existing = await db.get(doc._id || `complaint_${Date.now()}`);
      return res.json({ success: true, data: existing, complaint_id: existing._id });
    } catch (e) {
      // Doesn't exist, proceed to insert
    }

    const complaint = {
      ...doc,
      _id: doc._id || `complaint_${Date.now()}`,
      status: 'OPEN',
      sync_status: 'SYNCED',
      createdAt: doc.createdAt || new Date().toISOString(),
      resolvedAt: null,
      resolutionNotes: null
    };
    
    await db.insert(complaint);
    res.json({ success: true, data: complaint, complaint_id: complaint._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/complaints/:id/resolve — Admin resolves
router.put('/:id/resolve', async (req, res) => {
  const { resolutionNotes, createReplacementShipment, replacementQuantity, replacementVillage, grainType } = req.body;
  
  try {
    const db = await getDb('complaints');
    const doc = await db.get(req.params.id);

    if (createReplacementShipment && replacementQuantity && grainType && replacementVillage) {
      const shipmentsDb = await getDb('shipments');
      const grainsDb = await getDb('grains');
      
      // Attempt stock deduction for replacement
      let grainDoc;
      try {
        grainDoc = await grainsDb.get(grainType.toLowerCase());
        if ((grainDoc.currentStock || 0) < Number(replacementQuantity)) {
          return res.status(400).json({ success: false, message: 'Insufficient stock for replacement shipment.' });
        }
        grainDoc.currentStock -= Number(replacementQuantity);
        await grainsDb.insert(grainDoc);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid grain type or stock not found.' });
      }

      // Create replacement shipment
      const shipment = {
        _id: `ship_${Date.now()}`,
        grainType: grainType.toLowerCase(),
        quantity: Number(replacementQuantity),
        fromLocation: 'State Depot (Replacement)',
        toVillage: replacementVillage,
        toDistrict: 'Unknown',
        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: `Replacement for complaint ${doc._id}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await shipmentsDb.insert(shipment);
      doc.resolutionNotes = (resolutionNotes || 'Resolved by admin') + ` | Sent ${replacementQuantity}kg replacement shipment.`;
    } else {
      doc.resolutionNotes = resolutionNotes || 'Resolved by admin';
    }

    doc.status = 'RESOLVED';
    doc.resolvedAt = new Date().toISOString();
    await db.insert(doc);
    res.json({ success: true, message: 'Complaint resolved', data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
