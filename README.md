# P2P Web Crawler

A distributed web crawler system built using Pear by Holepunch. Each peer in the network is responsible for crawling a specific set of websites and shares the data with other peers through a P2P network.

## Features

- 🔄 **Distributed Crawling**: Each peer crawls a specific set of websites (up to 5 per peer)
- 🔍 **Automatic Website Assignment**: Websites are automatically assigned to peers based on a deterministic algorithm
- 🌐 **P2P Data Sharing**: Peers share crawled data with each other through Hypercore replication
- 📊 **Resource Efficiency**: Avoids duplicate crawling of the same websites
- ⚡ **Fast Access**: Quickly retrieve website content from any peer in the network
- 🔒 **Decentralized**: No central server or database required

## How It Works

1. When a peer joins the network, it's assigned a set of websites to crawl
2. Each peer periodically crawls its assigned websites and stores the data
3. Peers discover each other using Hyperswarm
4. When a peer needs data for a website it's not responsible for, it requests it from the responsible peer
5. Data is shared through Hypercore replication

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/p2p-crawler.git
cd p2p-crawler

# Install dependencies
npm install

# Create a .env file based on the example
cp .env.example .env
# Edit the .env file with your desired websites
```

## Configuration

Edit the `.env` file with the following variables:

```
# List of websites to crawl (comma-separated)
WEBSITES=https://example1.com/,https://example2.com,https://example3.com

# Optional: Set a specific peer ID (will be randomly generated if not provided)
# PEER_ID=my-custom-peer-id

# Optional: Set the storage path (defaults to ./storage)
# STORAGE_PATH=./my-custom-storage
```

## Usage

### Running the P2P Crawler

```bash
# Start the crawler
npm start
```

This will:

- Connect to the P2P network using Hyperswarm
- Assign websites to this peer based on the algorithm
- Begin crawling the assigned websites
- Share the data with other peers in the network

### Using the Client

```bash
# Run the example to request website content
npm run example

# Or use the client directly
npm run client
```

### Inspecting the Database

```bash
# View the contents of the database for the current peer
npm run read-db

# View the contents of the database for a specific peer
node src/read-db.js <peer-id>
```

### Running Multiple Peers

To test the system with multiple peers, you can:

1. Open multiple terminal windows
2. Use different PEER_ID values in each
3. Run the same application in each window

For example:

Terminal 1:

```bash
PEER_ID=peer1 npm start
```

Terminal 2:

```bash
PEER_ID=peer2 npm start
```

## Architecture

- **website-manager.js**: Handles website assignments to peers
- **peer.js**: Manages P2P network connections and data sharing
- **crawler.js**: Crawls websites and stores the data
- **db.js**: Manages the Hyperbee database for storing website data
- **client.js**: Client for requesting website content from the P2P network

## Built With

- [Pear by Holepunch](https://docs.pears.com/) - P2P Runtime
- [Hypercore](https://docs.pears.com/hypercore) - Append-only log for P2P applications
- [Hyperbee](https://docs.pears.com/hyperbee) - Append-only B-tree for Hypercore
- [Hyperswarm](https://docs.pears.com/hyperswarm) - Distributed peer discovery

## License

This project is licensed under the MIT License - see the LICENSE file for details.
