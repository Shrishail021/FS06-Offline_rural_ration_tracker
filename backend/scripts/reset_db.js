require('dotenv').config();
const nano = require('nano')(process.env.COUCHDB_URL || 'http://admin:shri@127.0.0.1:5984');
const bcrypt = require('bcryptjs');

const DBS = [
  'admin_users',
  'distributions',
  'ration_cards',
  'complaints',
  'shipments',
  'grains',
  'grain_purchases'
];

async function resetDb() {
  console.log('Starting full database reset...');

  for (const dbName of DBS) {
    try {
      console.log(`Destroying ${dbName}...`);
      await nano.db.destroy(dbName);
    } catch (e) {
      if (e.statusCode !== 404) console.error(`Error destroying ${dbName}:`, e.message);
    }
    try {
      console.log(`Creating ${dbName}...`);
      await nano.db.create(dbName);
    } catch (e) {
      console.error(`Error creating ${dbName}:`, e.message);
    }
  }

  // 1. Setup Admin Users
  const usersDb = nano.use('admin_users');
  console.log('Seeding users...');
  
  const adminPass = await bcrypt.hash('admin123', 10);
  const distPass = await bcrypt.hash('dist123', 10);

  const adminUser = {
    _id: 'admin',
    name: 'State Administrator',
    role: 'STATE_ADMIN',
    password_hash: adminPass,
    isActive: true,
    created_at: new Date().toISOString()
  };

  const distUser = {
    _id: 'dist_hubli_central',
    name: 'Ramesh (Hubli Central Dist)',
    role: 'DISTRIBUTOR',
    district: 'Dharwad',
    assignedVillage: 'Hubli Central',
    assignedLocation: 'Hubli Central (Dharwad)',
    password_hash: distPass,
    isActive: true,
    created_at: new Date().toISOString()
  };

  await usersDb.insert(adminUser);
  await usersDb.insert(distUser);
  console.log('Users seeded: admin, dist_hubli_central');

  // 2. Setup Grains & Purchases (Central Warehouse)
  const grainsDb = nano.use('grains');
  const purchasesDb = nano.use('grain_purchases');
  console.log('Seeding grains & warehouse stock...');

  const grains = [
    { _id: 'wheat', name: 'Wheat', unit: 'kg', reorderLevel: 500, currentStock: 5000, totalPurchased: 5000, pricePerUnit: 2, lastPurchaseDate: new Date().toISOString() },
    { _id: 'rice', name: 'Rice', unit: 'kg', reorderLevel: 500, currentStock: 8000, totalPurchased: 8000, pricePerUnit: 3, lastPurchaseDate: new Date().toISOString() },
    { _id: 'dal', name: 'Dal', unit: 'kg', reorderLevel: 200, currentStock: 2000, totalPurchased: 2000, pricePerUnit: 5, lastPurchaseDate: new Date().toISOString() }
  ];

  for (const g of grains) await grainsDb.insert(g);

  const purchases = [
    { _id: 'pur_1', grainId: 'wheat', grainName: 'Wheat', quantity: 5000, pricePerUnit: 2, totalCost: 10000, supplierName: 'FCI Hubli', status: 'RECEIVED', purchaseDate: new Date().toISOString(), createdAt: new Date().toISOString() },
    { _id: 'pur_2', grainId: 'rice', grainName: 'Rice', quantity: 8000, pricePerUnit: 3, totalCost: 24000, supplierName: 'FCI Hubli', status: 'RECEIVED', purchaseDate: new Date().toISOString(), createdAt: new Date().toISOString() },
    { _id: 'pur_3', grainId: 'dal', grainName: 'Dal', quantity: 2000, pricePerUnit: 5, totalCost: 10000, supplierName: 'AgriCorp', status: 'RECEIVED', purchaseDate: new Date().toISOString(), createdAt: new Date().toISOString() }
  ];
  
  for (const p of purchases) await purchasesDb.insert(p);

  // 3. Setup Logistics/Shipments (Moving stock to village)
  const shipmentsDb = nano.use('shipments');
  console.log('Seeding shipments to village...');

  const shipments = [
    { _id: 'ship_1', grainType: 'wheat', quantity: 1000, fromLocation: 'Central Warehouse (Dharwad)', toVillage: 'Hubli Central', toDistrict: 'Dharwad', status: 'DELIVERED', deliveryDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ship_2', grainType: 'rice', quantity: 2000, fromLocation: 'Central Warehouse (Dharwad)', toVillage: 'Hubli Central', toDistrict: 'Dharwad', status: 'DELIVERED', deliveryDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ship_3', grainType: 'dal', quantity: 500, fromLocation: 'Central Warehouse (Dharwad)', toVillage: 'Hubli Central', toDistrict: 'Dharwad', status: 'DELIVERED', deliveryDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  for (const s of shipments) await shipmentsDb.insert(s);

  // Deduct from central stock (simulated)
  const wheatDoc = await grainsDb.get('wheat');
  wheatDoc.currentStock -= 1000;
  await grainsDb.insert(wheatDoc);

  const riceDoc = await grainsDb.get('rice');
  riceDoc.currentStock -= 2000;
  await grainsDb.insert(riceDoc);

  const dalDoc = await grainsDb.get('dal');
  dalDoc.currentStock -= 500;
  await grainsDb.insert(dalDoc);

  // 4. Setup Ration Cards for the specific village
  const cardsDb = nano.use('ration_cards');
  console.log('Seeding ration cards...');

  const cards = [
    {
      _id: 'RC-HUB-001',
      cardNumber: 'RC-HUB-001',
      headName: 'Suresh Patil',
      district: 'Dharwad',
      village: 'Hubli Central',
      status: 'ACTIVE',
      members: [
        { name: 'Suresh Patil', age: '45', aadhaar: 'XXXX-XXXX-1234', alive: true },
        { name: 'Sunita Patil', age: '40', aadhaar: 'XXXX-XXXX-1235', alive: true },
        { name: 'Ravi Patil', age: '15', aadhaar: 'XXXX-XXXX-1236', alive: true }
      ],
      created_at: new Date().toISOString()
    },
    {
      _id: 'RC-HUB-002',
      cardNumber: 'RC-HUB-002',
      headName: 'Kavita Sharma',
      district: 'Dharwad',
      village: 'Hubli Central',
      status: 'ACTIVE',
      members: [
        { name: 'Kavita Sharma', age: '50', aadhaar: 'XXXX-XXXX-2234', alive: true },
        { name: 'Amit Sharma', age: '22', aadhaar: 'XXXX-XXXX-2235', alive: true }
      ],
      created_at: new Date().toISOString()
    }
  ];

  for (const c of cards) await cardsDb.insert(c);

  console.log('Database reset & seeded successfully! 🎉');
  console.log('--------------------------------------------------');
  console.log('Default Admin Login: admin / admin123');
  console.log('Default Distributor Login: dist_hubli_central / dist123');
  console.log('--------------------------------------------------');
}

resetDb().catch(console.error);
