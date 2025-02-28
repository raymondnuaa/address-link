# Address Link

A Node.js application that tracks token transfers on Ethereum and stores relationship data in Neo4j graph database.

## Features

- Fetches token transfer events from Ethereum blockchain
- Stores address relationships in Neo4j graph database
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

## Requirements

- Node.js
- Neo4j database
- Ethereum RPC endpoint (Infura or other provider)

## License

MIT 