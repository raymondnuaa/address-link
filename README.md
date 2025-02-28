# Address Link

A Node.js application that tracks token transfers on Ethereum and stores relationship data in Neo4j graph database and SQLite relational database.

## Features

- Fetches token transfer events from Ethereum blockchain
- Stores address relationships in Neo4j graph database
- Saves transfer data in SQLite relational database for efficient querying
- Tracks multi-token transfers between addresses

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` and fill in your values)
4. Start Neo4j database
5. Run the application:
   ```
   node src/index.js
   ```

## Database Structure

### Neo4j (Graph Database)
- Stores relationships between addresses
- Optimized for network analysis and path finding
- Visualizes connections between addresses

### SQLite (Relational Database)
- Stores detailed transfer information
- Provides fast querying for historical data
- Tables:
  - `addresses`: Stores unique addresses and their first/last seen timestamps
  - `tokens`: Stores token contract information
  - `transfers`: Stores individual transfer events

## Requirements

- Node.js
- Neo4j database
- Ethereum RPC endpoint (Infura or other provider)

## License

MIT 