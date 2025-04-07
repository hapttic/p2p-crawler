# P2P Web Crawler Diagrams

## How It Works

### P2P Network Structure

- **Peer 1 [peer_1]**

  - Assigned Website: imedinews.ge
  - Has a local Database
  - Runs a Deep Crawler
  - Crawls deeply up to 50 pages
  - Stores HTML in Database

- **Peer 2 [peer_2]**

  - Assigned Website: example.com
  - Has a local Database
  - Runs a Deep Crawler
  - Crawls deeply up to 50 pages
  - Stores HTML in Database

- **Peer 3 [peer_3]**
  - Assigned Website: another-site.com
  - Has a local Database
  - Runs a Deep Crawler
  - Crawls deeply up to 50 pages
  - Stores HTML in Database

### Network Connections

- Peers connect using Hyperswarm discovery
- Databases replicate using Hypercore
- Website Manager assigns websites to peers based on peer ID

### Deep Crawler Process

1. Crawls homepage
2. Extracts links
3. Follows links up to configured depth
4. Stores all pages with metadata
5. Indexes by domain and path

## Example Usage Scenarios

### Startup Scenario

1. User starts crawler on first machine (npm start)
2. User starts crawler on another computer
3. Peers join network and announce websites
4. Each peer crawls its assigned websites deeply (50 pages)

### Client Request - Specific Page

1. User runs: `npm run standalone https://imedinews.ge/article`
2. Client connects to P2P network
3. Client asks: "Who has imedinews.ge/article?"
4. Network responds: "Peer 1 has it"
5. Client requests page from Peer 1
6. Peer 1 returns page data
7. Client displays content to user

### Client Request - Entire Domain

1. User runs: `npm run standalone --domain example.com`
2. Client asks: "Who has example.com domain?"
3. Network responds: "Peer 2 has it"
4. Client requests all pages from Peer 2
5. Peer 2 returns 50 pages of data
6. Client displays all pages to user

## Network Topology

### Internet Components

- Hyperswarm DHT for peer discovery

### Computers in Network

- **Computer 1**: Peer 1 with database containing imedinews.ge
- **Computer 2**: Peer 2 with database containing example.com
- **Computer 3**: Peer 3 with database containing another-site.com
- **Computer 4**: Client for accessing data

### Connections

- All peers connect to Hyperswarm DHT
- Peers connect directly to each other after discovery
- Client connects to all peers
- Peers share their assigned websites with each other and client

## Database Organization

### Domain-Page Relationship

- Each DOMAIN contains multiple PAGES
- DOMAIN fields: domain, pages array, updated timestamp
- PAGE fields: url, domain, path, html, timestamp

### Indexing Structure

- DOMAIN_INDEX indexes multiple DOMAIN_ENTRIES
- Each DOMAIN_ENTRY contains multiple PAGE_ENTRIES
- DOMAIN_INDEX has key format: "index|domain"
- DOMAIN_ENTRY has domain name and array of page keys
- PAGE_ENTRY has key format: "domain|path", plus url, html, and timestamp

## Component Diagram

### Core Components

- **Website Manager**: Assigns websites to crawler
- **Crawler Engine**: Crawls websites, stores data in database
- **Peer Communication**: Exchanges data with other peers
- **Database**: Stores crawled website data

### Client Tools

- **Standalone Client**: Requests data from peers
- **Read Database Tool**: Reads directly from database

### Network Layer

- **Hyperswarm**: Discovers peers
- **Hypercore**: Append-only log for data replication
- **Hyperbee**: Key-value store using B-tree structure
