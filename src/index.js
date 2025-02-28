const { ethers } = require('ethers');
const { getMultiTokenTransferEvents } = require('./blockchain.js');
const { saveTransferEvent, closeDriver } = require('./neo4j.js');
const { initializeDatabase, saveTransfer, closeDatabase } = require('./sqlite.js');
require('dotenv').config();

// Initialize SQLite database
initializeDatabase();

async function processBlockRange(tokenAddress, fromBlock, toBlock) {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
  );

  const CHUNK_SIZE = 100;
  let currentFromBlock = fromBlock;

  while (currentFromBlock < toBlock) {
    const currentToBlock = Math.min(currentFromBlock + CHUNK_SIZE - 1, toBlock);
    
    console.log(`Processing blocks ${currentFromBlock} to ${currentToBlock}...`);
    
    try {
      const transfers = await getMultiTokenTransferEvents([tokenAddress], currentFromBlock, currentToBlock, provider);
      console.log(`Found ${transfers.length} transfers. Saving to databases...`);
      
      for (const transfer of transfers) {
        // Save to Neo4j
        await saveTransferEvent(
          transfer.txHash,
          transfer.fromAddress,
          transfer.toAddress,
          transfer.amount,
          transfer.tokenAddress
        );
        
        // Save to SQLite
        await saveTransfer({
          transactionHash: transfer.txHash,
          blockNumber: transfer.blockNumber,
          from: transfer.fromAddress,
          to: transfer.toAddress,
          value: transfer.amount,
          tokenAddress: transfer.tokenAddress,
          token: {
            address: transfer.tokenAddress,
            // These could be populated from a token metadata service if needed
            name: '',
            symbol: '',
            decimals: 0
          }
        });
      }
      
      console.log(`Completed processing blocks ${currentFromBlock} to ${currentToBlock}`);
    } catch (error) {
      console.error(`Error processing blocks ${currentFromBlock} to ${currentToBlock}:`, error);
    }

    currentFromBlock = currentToBlock + 1;
  }

  // Close database connections
  await closeDriver();
  closeDatabase();
}

async function main() {
  // Example: Fetch USDT transfers
  const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT
  const fromBlock = 17000000;  // You can specify your desired start block
  const toBlock = 17001000;    // You can specify your desired end block

  await processBlockRange(tokenAddress, fromBlock, toBlock);
  console.log('Done!');
}

main().catch(console.error);