require('dotenv').config();
const nano = require('nano')(process.env.COUCHDB_URL || 'http://admin:shri@127.0.0.1:5984');

// Initialize database instances
const getDb = async (dbName) => {
  try {
    const dbList = await nano.db.list();
    if (!dbList.includes(dbName)) {
      await nano.db.create(dbName);
      console.log(`Created CouchDB database: ${dbName}`);
    }
    return nano.use(dbName);
  } catch (err) {
    console.error(`CouchDB connection error for ${dbName}:`, err.message);
    // Return a fallback or throw depending on how strict you want to be
    return nano.use(dbName);
  }
};

module.exports = {
  nano,
  getDb
};
