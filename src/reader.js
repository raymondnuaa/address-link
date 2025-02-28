const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function getLinkedAddresses(startAddress, maxHops, direction = 'forward') {
  const session = driver.session();
  let query;
  
  if (direction === 'forward') {
    query = `
      MATCH (start:Address {address_id: $startAddress})-[t:TRANSFER*1..${maxHops}]->(related:Address)
      RETURN DISTINCT related.address_id
      LIMIT 10
    `;
  } else if (direction === 'backward') {
    query = `
      MATCH (start:Address {address_id: $startAddress})<-[t:TRANSFER*1..${maxHops}]-(related:Address)
      RETURN DISTINCT related.address_id
      LIMIT 10
    `;
  } else {
    query = `
      MATCH (start:Address {address_id: $startAddress})-[t:TRANSFER*1..${maxHops}]-(related:Address)
      RETURN DISTINCT related.address_id
      LIMIT 10
    `;
  }

  try {
    const result = await session.run(query, { startAddress });
    return result.records.map(record => record.get('related.address_id'));
  } catch (error) {
    console.error('Query error:', error);
    return [];
  } finally {
    await session.close();
  }
}

// Example usage
async function main() {
  try {
    const addressesForward = await getLinkedAddresses("0x9008D19f58AAbD9eD0D60971565AA8510560ab41", 2, "forward");
    console.log("Forward (downward) addresses:", addressesForward);

    const addressesBackward = await getLinkedAddresses("0x9008D19f58AAbD9eD0D60971565AA8510560ab41", 2, "backward");
    console.log("Backward (upward) addresses:", addressesBackward);
  } finally {
    await driver.close(); // Close the driver connection when done
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0)); // Ensure the process exits even if there's an error