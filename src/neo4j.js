const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function saveTransferEvent(txHash, fromAddress, toAddress, amount, tokenAddress) {
  const session = driver.session();
  try {
    await session.run(
      `
      MERGE (from:Address {address_id: $fromAddress})
      MERGE (to:Address {address_id: $toAddress})
      CREATE (from)-[:TRANSFER {
        transaction_hash: $txHash,
        amount: $amount,
        token_address: $tokenAddress
      }]->(to)
      `,
      { txHash, fromAddress, toAddress, amount, tokenAddress }
    );
    console.log(`Saved transfer: ${txHash}`);
  } catch (error) {
    console.error('Neo4j error:', error);
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  await driver.close();
}

module.exports = { saveTransferEvent, closeDriver };
