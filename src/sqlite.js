const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'transfers.db');

// Initialize database connection
let db;

/**
 * Initialize the SQLite database
 */
function initializeDatabase() {
  try {
    db = new Database(dbPath);
    console.log(`Connected to SQLite database at ${dbPath}`);
    
    // Create tables if they don't exist
    createTables();
    
    return db;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}

/**
 * Create necessary tables in the database
 */
function createTables() {
  // Create addresses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
      address TEXT PRIMARY KEY,
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      address TEXT PRIMARY KEY,
      name TEXT,
      symbol TEXT,
      decimals INTEGER
    )
  `);
  
  // Create transfers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      value TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_address) REFERENCES addresses(address),
      FOREIGN KEY (to_address) REFERENCES addresses(address),
      FOREIGN KEY (token_address) REFERENCES tokens(address)
    )
  `);
  
  // Create index on transaction hash
  db.exec(`CREATE INDEX IF NOT EXISTS idx_transfers_tx_hash ON transfers(tx_hash)`);
  
  console.log('SQLite database tables created successfully');
}

/**
 * Save a token transfer to the database
 * @param {Object} transfer - Transfer event data
 */
async function saveTransfer(transfer) {
  try {
    // Prepare statements for better performance with multiple inserts
    const insertAddress = db.prepare(`
      INSERT OR IGNORE INTO addresses (address, last_seen) 
      VALUES (?, CURRENT_TIMESTAMP)
    `);
    
    const updateAddress = db.prepare(`
      UPDATE addresses SET last_seen = CURRENT_TIMESTAMP 
      WHERE address = ?
    `);
    
    const insertToken = db.prepare(`
      INSERT OR IGNORE INTO tokens (address, name, symbol, decimals) 
      VALUES (?, ?, ?, ?)
    `);
    
    const insertTransfer = db.prepare(`
      INSERT INTO transfers (tx_hash, block_number, from_address, to_address, token_address, value) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Begin transaction for better performance and data integrity
    const transaction = db.transaction(() => {
      // Insert or update addresses
      insertAddress.run(transfer.from);
      updateAddress.run(transfer.from);
      
      insertAddress.run(transfer.to);
      updateAddress.run(transfer.to);
      
      // Insert token if it doesn't exist
      if (transfer.token) {
        insertToken.run(
          transfer.token.address,
          transfer.token.name || '',
          transfer.token.symbol || '',
          transfer.token.decimals || 0
        );
      }
      
      // Insert transfer
      insertTransfer.run(
        transfer.transactionHash,
        transfer.blockNumber,
        transfer.from,
        transfer.to,
        transfer.token ? transfer.token.address : transfer.tokenAddress || '0x0',
        transfer.value || '0'
      );
    });
    
    // Execute the transaction
    transaction();
    
    return true;
  } catch (error) {
    console.error('Error saving transfer to SQLite:', error);
    return false;
  }
}

/**
 * Get transfers by address
 * @param {string} address - Ethereum address
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of transfers
 */
function getTransfersByAddress(address, limit = 100) {
  try {
    const query = `
      SELECT t.*, 
             tk.name as token_name, 
             tk.symbol as token_symbol, 
             tk.decimals as token_decimals
      FROM transfers t
      LEFT JOIN tokens tk ON t.token_address = tk.address
      WHERE t.from_address = ? OR t.to_address = ?
      ORDER BY t.block_number DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    return stmt.all(address, address, limit);
  } catch (error) {
    console.error('Error getting transfers by address:', error);
    return [];
  }
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    console.log('SQLite database connection closed');
  }
}

module.exports = {
  initializeDatabase,
  saveTransfer,
  getTransfersByAddress,
  closeDatabase,
  getDatabase: () => db
}; 