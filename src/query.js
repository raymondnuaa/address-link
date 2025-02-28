const { initializeDatabase, getTransfersByAddress, closeDatabase } = require('./sqlite');
require('dotenv').config();

/**
 * Query transfers for a specific address
 */
async function queryAddressTransfers(address, limit = 10) {
  try {
    // Initialize the database
    initializeDatabase();
    
    console.log(`Querying transfers for address: ${address}`);
    
    // Get transfers for the address
    const transfers = getTransfersByAddress(address, limit);
    
    console.log(`Found ${transfers.length} transfers for ${address}`);
    
    // Display the transfers
    if (transfers.length > 0) {
      console.table(transfers.map(t => ({
        id: t.id,
        blockNumber: t.block_number,
        from: t.from_address.substring(0, 10) + '...',
        to: t.to_address.substring(0, 10) + '...',
        token: t.token_symbol || t.token_address.substring(0, 10) + '...',
        value: t.value,
        txHash: t.tx_hash.substring(0, 10) + '...'
      })));
    }
    
    // Close the database connection
    closeDatabase();
    
    return transfers;
  } catch (error) {
    console.error('Error querying transfers:', error);
    closeDatabase();
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  // Check if an address was provided as a command-line argument
  const address = process.argv[2];
  
  if (!address) {
    console.error('Please provide an Ethereum address as a command-line argument');
    console.log('Usage: node query.js <ethereum_address> [limit]');
    process.exit(1);
  }
  
  // Check if a limit was provided
  const limit = process.argv[3] ? parseInt(process.argv[3]) : 10;
  
  await queryAddressTransfers(address, limit);
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { queryAddressTransfers }; 