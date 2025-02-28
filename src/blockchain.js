const { ethers } = require('ethers');
require('dotenv').config();

const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function getMultiTokenTransferEvents(tokenAddresses, fromBlock, toBlock, provider) {
  // Input validation
  if (!tokenAddresses?.length || fromBlock > toBlock || fromBlock < 0) {
    throw new Error('Invalid inputs: tokenAddresses must be non-empty and fromBlock <= toBlock');
  }

  // Separate ETH (0x0) from ERC20 tokens
  const erc20Addresses = tokenAddresses.filter(addr => addr !== '0x0');
  const includeEth = tokenAddresses.includes('0x0');

  let allTransfers = [];

  // Fetch native ETH transfers
  if (includeEth) {
    const ethTransfers = [];
    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
      const block = await withRetry(() => provider.getBlock(blockNum, true));
      const transfers = block.transactions
        .filter(tx => tx && tx.value && tx.to) 
        .filter(tx => BigInt(tx.value) > 0n)  // Exclude zero-value and contract creations
        .map(tx => ({
          txHash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          amount: tx.value.toString(),
          tokenAddress: '0x0',
          type: 'ETH',
          blockNumber: block.number
        }));
      ethTransfers.push(...transfers);
    }
    allTransfers.push(...ethTransfers);
  }

  // Fetch ERC-20 transfers with multi-address filter
  if (erc20Addresses.length > 0) {
    const logs = await withRetry(() => provider.send('eth_getLogs', [{
      address: erc20Addresses.map(addr => addr.toLowerCase()), // Normalize to lowercase
      topics: [TRANSFER_EVENT_TOPIC],
      fromBlock: ethers.toBeHex(fromBlock),
      toBlock: ethers.toBeHex(toBlock)
    }]));

    const erc20Transfers = logs.map(log => {
      // For Transfer events, from and to addresses are in topics[1] and topics[2]
      const [, fromTopic, toTopic] = log.topics;
      const from = ethers.dataSlice(fromTopic, 12); // Remove padding
      const to = ethers.dataSlice(toTopic, 12); // Remove padding
      const value = ethers.getBigInt(log.data);

      return {
        txHash: log.transactionHash,
        fromAddress: from,
        toAddress: to,
        amount: value.toString(),
        tokenAddress: log.address,
        type: 'ERC20',
        blockNumber: parseInt(log.blockNumber, 16)
      };
    });
    allTransfers.push(...erc20Transfers);
  }

  // Sort by block number and deduplicate by txHash
  return Array.from(
    new Map(allTransfers.map(t => [t.txHash, t])).values()
  ).sort((a, b) => a.blockNumber - b.blockNumber);
}

// Example usage
async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
  );
  const tokenAddresses = [
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0x0' // ETH
  ];

  const latestBlock = await provider.getBlockNumber();
  const fromBlock = latestBlock - 10;
  const toBlock = latestBlock;

  console.log(`Fetching transfers from block ${fromBlock} to ${toBlock}...`);
  const transfers = await getMultiTokenTransferEvents(tokenAddresses, fromBlock, toBlock, provider);
  console.log(`Fetched ${transfers.length} transfers:`);
  transfers.forEach(t => console.log(`${t.type}: ${t.fromAddress} -> ${t.toAddress}, ${t.amount}`));
}

if (require.main === module) main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

module.exports = { getMultiTokenTransferEvents };