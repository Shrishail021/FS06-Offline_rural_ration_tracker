const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');

// Default grain catalog
const GRAIN_CATALOG = [
  { _id: 'wheat', name: 'Wheat', unit: 'kg', reorderLevel: 500, currentStock: 0, totalPurchased: 0, pricePerUnit: 2 },
  { _id: 'rice', name: 'Rice', unit: 'kg', reorderLevel: 500, currentStock: 0, totalPurchased: 0, pricePerUnit: 3 },
  { _id: 'dal', name: 'Dal', unit: 'kg', reorderLevel: 200, currentStock: 0, totalPurchased: 0, pricePerUnit: 5 },
  { _id: 'jowar', name: 'Jowar', unit: 'kg', reorderLevel: 200, currentStock: 0, totalPurchased: 0, pricePerUnit: 2 },
];

// Ensure grains exist in DB with defaults
const ensureGrains = async (db) => {
  for (const grain of GRAIN_CATALOG) {
    try {
      await db.get(grain._id);
    } catch (e) {
      await db.insert(grain); // create if missing
    }
  }
};

// GET /api/admin/grains
router.get('/grains', async (req, res) => {
  try {
    const db = await getDb('grains');
    await ensureGrains(db);
    const result = await db.list({ include_docs: true });
    const grains = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    res.json({ success: true, data: grains });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/grains/purchase — Buy grain (updates stock + logs purchase)
router.post('/grains/purchase', async (req, res) => {
  const { grainId, grainName, quantity, pricePerUnit, supplierId, supplierName, invoiceNumber, purchaseDate, notes } = req.body;

  if (!grainId || !quantity || !pricePerUnit) {
    return res.status(400).json({ success: false, message: 'Grain ID, quantity and price are required' });
  }

  try {
    const grainsDb = await getDb('grains');
    const purchasesDb = await getDb('grain_purchases');

    // 1. Update grain stock
    let grainDoc;
    try {
      grainDoc = await grainsDb.get(grainId);
    } catch (e) {
      // Create grain doc if it doesn't exist (for custom grain IDs)
      grainDoc = { _id: grainId, name: grainName || grainId, unit: 'kg', reorderLevel: 200, currentStock: 0, totalPurchased: 0 };
    }
    grainDoc.currentStock = (grainDoc.currentStock || 0) + Number(quantity);
    grainDoc.totalPurchased = (grainDoc.totalPurchased || 0) + Number(quantity);
    grainDoc.pricePerUnit = Number(pricePerUnit);
    grainDoc.lastPurchaseDate = purchaseDate || new Date().toISOString().split('T')[0];
    await grainsDb.insert(grainDoc);

    // 2. Log purchase record
    const purchase = {
      _id: `purchase_${Date.now()}`,
      grainId, grainName: grainDoc.name,
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
      totalCost: Number(quantity) * Number(pricePerUnit),
      supplierId, supplierName, invoiceNumber,
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      notes,
      status: 'RECEIVED',
      createdAt: new Date().toISOString()
    };
    await purchasesDb.insert(purchase);

    res.json({ success: true, data: purchase, updatedStock: grainDoc.currentStock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/grains/purchases — Purchase history
router.get('/grains/purchases', async (req, res) => {
  try {
    const db = await getDb('grain_purchases');
    const result = await db.list({ include_docs: true, descending: true });
    const purchases = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/grains/:id — Update grain metadata
router.put('/grains/:id', async (req, res) => {
  try {
    const db = await getDb('grains');
    const doc = await db.get(req.params.id);
    const { pricePerUnit, reorderLevel, name } = req.body;
    if (pricePerUnit !== undefined) doc.pricePerUnit = Number(pricePerUnit);
    if (reorderLevel !== undefined) doc.reorderLevel = Number(reorderLevel);
    if (name) doc.name = name;
    doc.updatedAt = new Date().toISOString();
    await db.insert(doc);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/ration-cards
router.get('/ration-cards', async (req, res) => {
  try {
    const db = await getDb('ration_cards');
    const result = await db.list({ include_docs: true });
    const cards = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/ration-cards
router.post('/ration-cards', async (req, res) => {
  const { cardNumber, headName, members, village, district, location } = req.body;
  if (!cardNumber || !headName) {
    return res.status(400).json({ success: false, message: 'Card number and head name required' });
  }
  try {
    const db = await getDb('ration_cards');
    const doc = { _id: cardNumber, cardNumber, headName, members: members || [], village, district, location, status: 'ACTIVE', created_at: new Date().toISOString() };
    await db.insert(doc);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/ration-cards/:id
router.put('/ration-cards/:id', async (req, res) => {
  try {
    const db = await getDb('ration_cards');
    const doc = await db.get(req.params.id);
    const { status, members } = req.body;
    if (status !== undefined) doc.status = status;
    if (members !== undefined) doc.members = members;
    doc.updated_at = new Date().toISOString();
    await db.insert(doc);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const db = await getDb('admin_users');
    const result = await db.list({ include_docs: true });
    const users = result.rows.filter(r => !r.id.startsWith('_design')).map(r => { const { password_hash, ...safe } = r.doc; return safe; });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const bcrypt = require('bcryptjs');
// POST /api/admin/users
router.post('/users', async (req, res) => {
  const { username, password, role, name, assignedLocation, assignedVillage, district } = req.body;
  if (!username || !password || !role) return res.status(400).json({ success: false, message: 'Username, password and role required' });
  try {
    const db = await getDb('admin_users');
    try { await db.get(username); return res.status(409).json({ success: false, message: 'User already exists' }); } catch (e) {}
    const doc = {
      _id: username, name, role,
      assignedLocation: assignedLocation || null,
      assignedVillage: assignedVillage || null,
      district: district || null,
      password_hash: await bcrypt.hash(password, 10),
      demo_password: password, // For hackathon demo purposes
      isActive: true,
      created_at: new Date().toISOString(),
      last_login: null
    };
    await db.insert(doc);
    const { password_hash, ...safe } = doc;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const db = await getDb('admin_users');
    const doc = await db.get(req.params.id);
    const { name, role, assignedLocation, assignedVillage, district, isActive } = req.body;
    if (name !== undefined) doc.name = name;
    if (role !== undefined) doc.role = role;
    if (assignedLocation !== undefined) doc.assignedLocation = assignedLocation;
    if (assignedVillage !== undefined) doc.assignedVillage = assignedVillage;
    if (district !== undefined) doc.district = district;
    if (isActive !== undefined) doc.isActive = isActive;
    await db.insert(doc);
    const { password_hash, ...safe } = doc;
    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/conflicts
router.get('/conflicts', async (req, res) => {
  try {
    const db = await getDb('distributions');
    const result = await db.list({ include_docs: true });
    const conflicts = result.rows.filter(r => !r.id.startsWith('_design') && r.doc.sync_status === 'CONFLICT').map(r => r.doc);
    res.json({ success: true, data: conflicts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/distributions - All synced transactions (supports ?village= and ?district= filters)
router.get('/distributions', async (req, res) => {
  try {
    const db = await getDb('distributions');
    const result = await db.list({ include_docs: true, descending: true });
    let distributions = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    const { village, district } = req.query;
    if (village) distributions = distributions.filter(d => d.village?.toLowerCase() === village.toLowerCase());
    if (district) distributions = distributions.filter(d => d.district?.toLowerCase() === district.toLowerCase());
    res.json({ success: true, data: distributions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const adminDb = await getDb('admin_users');
    const distDb = await getDb('distributions');
    let activeDistributors = 0;
    try {
      const usersInfo = await adminDb.list({ include_docs: true });
      activeDistributors = usersInfo.rows.filter(r => r.doc && r.doc.role === 'DISTRIBUTOR' && r.doc.isActive !== false).length;
    } catch (e) {}
    let totalDistributed = 0;
    let openConflicts = 0;
    let distributionData = [];
    try {
      const distInfo = await distDb.list({ include_docs: true });
      const dayCounts = {};
      distInfo.rows.forEach(r => {
        if (!r.doc._id?.startsWith('_design')) {
          totalDistributed += Number(r.doc.quantity) || 0;
          if (r.doc.sync_status === 'CONFLICT') openConflicts++;
          const day = new Date(r.doc.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
          dayCounts[day] = (dayCounts[day] || 0) + (Number(r.doc.quantity) || 0);
        }
      });
      const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      distributionData = defaultDays.map(day => ({ name: day, dist: dayCounts[day] || 0 }));
    } catch (e) {}
    res.json({ success: true, data: { totalDistributed: totalDistributed.toFixed(1), activeDistributors, openConflicts, chartData: distributionData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/monthly-report — Receive monthly distribution report from distributor
router.post('/monthly-report', async (req, res) => {
  try {
    const db = await getDb('monthly_reports');
    const report = {
      _id: `report_${req.body.village}_${req.body.month}_${req.body.year}_${Date.now()}`,
      ...req.body,
      receivedAt: new Date().toISOString(),
    };
    await db.insert(report);
    res.json({ success: true, message: 'Monthly report received.', reportId: report._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/monthly-reports — List all monthly reports
router.get('/monthly-reports', async (req, res) => {
  try {
    const db = await getDb('monthly_reports');
    const result = await db.list({ include_docs: true, descending: true });
    const reports = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

