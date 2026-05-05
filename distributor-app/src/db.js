import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import { v4 as uuidv4 } from 'uuid';

PouchDB.plugin(PouchDBFind);

// Generate or retrieve unique Device ID
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `DEV-${uuidv4().split('-')[0].toUpperCase()}-${uuidv4().split('-')[1].toUpperCase()}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const COUCHDB_URL = 'http://127.0.0.1:5984';
const authConfig = { auth: { username: 'admin', password: 'shri' } };

export const distributionsDb = new PouchDB('distributions');
export const cardsDb = new PouchDB('ration_cards');
export const complaintsDb = new PouchDB('complaints');
export const settingsDb = new PouchDB('settings');
export const logsDb = new PouchDB('distribution_logs'); // Monthly dedup log
export const shipmentsDb = new PouchDB('shipments'); // Village stock

const initDb = async () => {
  try {
    await distributionsDb.createIndex({ index: { fields: ['sync_status'] } });
    await distributionsDb.createIndex({ index: { fields: ['rationCardId', 'month', 'year'] } });
    await cardsDb.createIndex({ index: { fields: ['cardNumber', 'status'] } });
    await logsDb.createIndex({ index: { fields: ['rationCardId', 'month', 'year'] } });
    console.log('PouchDB initialized.');
  } catch (err) {
    console.error('PouchDB init error:', err);
  }
};
initDb();

// Global sync handlers
let syncHandlers = [];

// Live sync with CouchDB
export const startLiveSync = (onStatusChange) => {
  if (syncHandlers.length > 0) {
    // Already syncing
    return syncHandlers[0];
  }

  const remoteDistributions = new PouchDB(`${COUCHDB_URL}/distributions`, authConfig);
  const remoteComplaints = new PouchDB(`${COUCHDB_URL}/complaints`, authConfig);
  const remoteShipments = new PouchDB(`${COUCHDB_URL}/shipments`, authConfig);
  const remoteCards = new PouchDB(`${COUCHDB_URL}/ration_cards`, authConfig);

  // Pull remote data down to local (read-only for distributor offline usage)
  syncHandlers.push(PouchDB.replicate(remoteShipments, shipmentsDb, { live: true, retry: true }));
  syncHandlers.push(PouchDB.replicate(remoteCards, cardsDb, { live: true, retry: true }));

  const complaintsSync = PouchDB.sync(complaintsDb, remoteComplaints, { live: true, retry: true })
    .on('change', async (info) => {
      // Update sync_status of locally synced docs
      if (info.direction === 'push') {
        const docs = info.change.docs;
        for (const doc of docs) {
          if (doc.sync_status === 'PENDING') {
            doc.sync_status = 'SYNCED';
            await complaintsDb.put(doc);
          }
        }
      }
    });
  syncHandlers.push(complaintsSync);

  const distributionsSync = PouchDB.sync(distributionsDb, remoteDistributions, { live: true, retry: true })
    .on('change', async (info) => { 
      if (info.direction === 'push') {
        const docs = info.change.docs;
        for (const doc of docs) {
          if (doc.sync_status === 'PENDING') {
            try {
              const localDoc = await distributionsDb.get(doc._id);
              localDoc.sync_status = 'SYNCED';
              await distributionsDb.put(localDoc);
            } catch (err) {
              console.error('Failed to update sync_status:', err);
            }
          }
        }
      }
      if (onStatusChange) onStatusChange('syncing', info); 
    })
    .on('paused', err => { if (onStatusChange) onStatusChange('paused', err); })
    .on('active', () => { if (onStatusChange) onStatusChange('active'); })
    .on('error', err => { if (onStatusChange) onStatusChange('error', err); });

  syncHandlers.push(distributionsSync);
  
  return {
    cancel: () => {
      syncHandlers.forEach(h => h.cancel && h.cancel());
      syncHandlers = [];
    }
  };
};

// Save distribution offline with dedup check
export const saveDistributionOffline = async (distributionData) => {
  const deviceId = getDeviceId();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Check local monthly dedup
  const dupCheck = await logsDb.find({
    selector: { rationCardId: distributionData.rationCardId, month, year }
  });
  if (dupCheck.docs.length > 0) {
    throw new Error('ALREADY_DISTRIBUTED: This ration card has already been served this month.');
  }

  const transactionId = `${deviceId}_${now.getTime()}_${distributionData.rationCardId}`;
  const transaction = {
    _id: transactionId,
    ...distributionData,
    deviceId,
    transactionId,
    month, year,
    sync_status: 'PENDING',
    createdAt: now.toISOString()
  };

  await distributionsDb.put(transaction);

  // Record in local monthly log
  await logsDb.put({
    _id: `log_${distributionData.rationCardId}_${month}_${year}`,
    rationCardId: distributionData.rationCardId,
    month, year,
    transactionId,
    distributedAt: now.toISOString()
  });

  return transaction;
};

// Save a multi-grain basket
export const saveBasketOffline = async (baseData, basket) => {
  const deviceId = getDeviceId();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Check local monthly dedup
  const dupCheck = await logsDb.find({
    selector: { rationCardId: baseData.rationCardId, month, year }
  });
  if (dupCheck.docs.length > 0) {
    throw new Error('ALREADY_DISTRIBUTED: This ration card has already been served this month.');
  }

  const batchId = `${deviceId}_${now.getTime()}_${baseData.rationCardId}`;
  
  const docs = basket.map((item, idx) => ({
    _id: `${batchId}_${idx}`,
    ...baseData,
    grainType: item.grainType,
    quantity: item.quantity,
    deviceId,
    transactionId: batchId,
    month, year,
    sync_status: 'PENDING',
    createdAt: now.toISOString()
  }));

  for (const doc of docs) {
    await distributionsDb.put(doc);
  }

  await logsDb.put({
    _id: `log_${baseData.rationCardId}_${month}_${year}`,
    rationCardId: baseData.rationCardId,
    month, year,
    transactionId: batchId,
    distributedAt: now.toISOString()
  });

  return { transactionId: batchId, docs };
};

export const getPendingDistributions = async () => {
  const result = await distributionsDb.find({ selector: { sync_status: 'PENDING' } });
  return result.docs;
};

export const getAllDistributions = async () => {
  const result = await distributionsDb.allDocs({ include_docs: true, descending: true });
  return result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
};

export const checkAlreadyDistributed = async (rationCardId) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const dupCheck = await logsDb.find({ selector: { rationCardId, month, year } });
  return dupCheck.docs.length > 0;
};

export const searchRationCards = async (query) => {
  const result = await cardsDb.allDocs({ include_docs: true });
  const docs = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
  if (!query) return docs;
  const q = query.toLowerCase();
  return docs.filter(c =>
    c._id?.toLowerCase().includes(q) ||
    c.headName?.toLowerCase().includes(q) ||
    c.members?.some(m => m.aadhaar?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q))
  );
};

// Sync complaints to server
export const syncComplaint = async (complaint) => {
  try {
    const res = await fetch('http://localhost:5000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaint)
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const getLocalStock = async (village, grainType) => {
  const [shipments, distributions] = await Promise.all([
    shipmentsDb.allDocs({ include_docs: true }),
    distributionsDb.allDocs({ include_docs: true })
  ]);
  
  const v = village?.toLowerCase() || '';
  const g = grainType?.toLowerCase() || '';

  // Sum all DELIVERED shipments for this village and grain type
  const totalShipped = shipments.rows
    .map(r => r.doc)
    .filter(d => d.status === 'DELIVERED' && d.toVillage?.toLowerCase() === v && d.grainType?.toLowerCase() === g)
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  // Sum all DISTRIBUTED logs for this village and grain type
  const totalDistributed = distributions.rows
    .map(r => r.doc)
    .filter(d => d.village?.toLowerCase() === v && d.grainType?.toLowerCase() === g)
    .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  return Math.max(0, totalShipped - totalDistributed);
};
