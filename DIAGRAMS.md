# P2P Web Crawler Diagrams

## How It Works

```mermaid
graph TB
subgraph "P2P Network"
subgraph "Peer 1 [peer_1]"
P1W[Assigned Website: imedinews.ge]
P1DB[(Database)]
P1C[Deep Crawler]

            P1C -->|Crawls deeply<br>up to 50 pages| P1W
            P1W -->|Stores HTML| P1DB
        end

        subgraph "Peer 2 [peer_2]"
            P2W[Assigned Website: example.com]
            P2DB[(Database)]
            P2C[Deep Crawler]

            P2C -->|Crawls deeply<br>up to 50 pages| P2W
            P2W -->|Stores HTML| P2DB
        end

        subgraph "Peer 3 [peer_3]"
            P3W[Assigned Website: another-site.com]
            P3DB[(Database)]
            P3C[Deep Crawler]

            P3C -->|Crawls deeply<br>up to 50 pages| P3W
            P3W -->|Stores HTML| P3DB
        end

        %% Connect the peers - fixed to connect specific components
        P1DB <-->|Hyperswarm<br>discovery| P2DB
        P2DB <-->|Hyperswarm<br>discovery| P3DB
        P3DB <-->|Hyperswarm<br>discovery| P1DB

        %% Replicate databases
        P1DB <-.->|Hypercore<br>replication| P2DB
        P2DB <-.->|Hypercore<br>replication| P3DB
        P3DB <-.->|Hypercore<br>replication| P1DB

        %% Website Manager
        WM[Website Manager]
        WM -->|Assigns websites<br>based on peer ID| P1W
        WM -->|Assigns websites<br>based on peer ID| P2W
        WM -->|Assigns websites<br>based on peer ID| P3W
    end

    %% Deep Crawler Details connected properly
    subgraph "Deep Crawler"
        DC1[1. Crawls homepage]
        DC2[2. Extracts links]
        DC3[3. Follows links up to<br>configured depth]
        DC4[4. Stores all pages<br>with metadata]
        DC5[5. Indexes by domain<br>and path]

        DC1 --> DC2 --> DC3 --> DC4 --> DC5
    end

    %% Connect crawler details to actual crawlers
    DC5 -.-> P1C
    DC5 -.-> P2C
    DC5 -.-> P3C
```

## Example Usage Scenarios

```mermaid
sequenceDiagram
    participant User as User
    participant Client as Standalone Client
    participant P2P as P2P Network
    participant Peer1 as Peer 1 (crawling imedinews.ge)
    participant Peer2 as Peer 2 (crawling example.com)

    %% Startup Scenario
    User->>Peer1: Starts crawler<br>(npm start)
    User->>Peer2: Starts crawler on<br>another computer

    Peer1->>P2P: Joins network<br>announces websites
    Peer2->>P2P: Joins network<br>announces websites

    Peer1->>Peer1: Crawls imedinews.ge deeply<br>(50 pages)
    Peer2->>Peer2: Crawls example.com deeply<br>(50 pages)

    %% Client request - specific page
    User->>Client: npm run standalone https://imedinews.ge/article
    Client->>P2P: Connect to network
    P2P->>Client: Connect to peers
    Client->>P2P: Who has imedinews.ge/article?
    P2P->>Client: Peer 1 has it
    Client->>Peer1: Request imedinews.ge/article
    Peer1->>Client: Return page data
    Client->>User: Display page content

    %% Client request - entire domain
    User->>Client: npm run standalone --domain example.com
    Client->>P2P: Who has example.com domain?
    P2P->>Client: Peer 2 has it
    Client->>Peer2: Request all pages from example.com
    Peer2->>Client: Return 50 pages of data
    Client->>User: Display all pages
```

## Network Topology

```mermaid
flowchart TB
    subgraph "Internet"
        H1[Hyperswarm DHT]
    end

    subgraph "Computer 1"
        P1[Peer 1]
        P1DB[(Database with<br>imedinews.ge)]
    end

    subgraph "Computer 2"
        P2[Peer 2]
        P2DB[(Database with<br>example.com)]
    end

    subgraph "Computer 3"
        P3[Peer 3]
        P3DB[(Database with<br>another-site.com)]
    end

    subgraph "Computer 4"
        C1[Client]
    end

    %% Connect peers to DHT
    P1 <--> H1
    P2 <--> H1
    P3 <--> H1
    C1 <--> H1

    %% Direct peer connections after discovery
    P1 <--> P2
    P2 <--> P3
    P3 <--> P1
    C1 <--> P1
    C1 <--> P2
    C1 <--> P3

    %% Data flow
    P1 -->|Shares imedinews.ge| P2
    P1 -->|Shares imedinews.ge| P3
    P1 -->|Shares imedinews.ge| C1

    P2 -->|Shares example.com| P1
    P2 -->|Shares example.com| P3
    P2 -->|Shares example.com| C1

    P3 -->|Shares another-site.com| P1
    P3 -->|Shares another-site.com| P2
    P3 -->|Shares another-site.com| C1
```

## Database Organization

```mermaid
erDiagram
    DOMAIN ||--o{ PAGE : contains
    DOMAIN {
        string domain
        array pages
        timestamp updated
    }
    PAGE {
        string url
        string domain
        string path
        string html
        timestamp timestamp
    }

    %% Example structure
    DOMAIN_INDEX ||--o{ DOMAIN_ENTRY : indexes
    DOMAIN_ENTRY ||--o{ PAGE_ENTRY : contains

    DOMAIN_INDEX {
        string key "index|domain"
    }
    DOMAIN_ENTRY {
        string domain "example.com"
        array pageKeys "[keys...]"
        timestamp updated
    }
    PAGE_ENTRY {
        string key "domain|path"
        string url "full URL"
        string html "content"
        timestamp timestamp
    }
```

## Component Diagram

```mermaid
graph TD
    subgraph "P2P Web Crawler System"
        subgraph "Core Components"
            WM[Website Manager]
            C[Crawler Engine]
            P[Peer Communication]
            DB[Database]

            WM -->|Assigns websites| C
            C -->|Stores data| DB
            P -->|Exchanges data| DB
            WM <-->|Shares assignments| P
        end

        subgraph "Client Tools"
            SC[Standalone Client]
            RDB[Read Database Tool]

            SC -->|Requests data| P
            RDB -->|Reads directly| DB
        end

        subgraph "Network Layer"
            HS[Hyperswarm]
            HC[Hypercore]
            HB[Hyperbee]

            P -->|Discovers peers| HS
            DB -->|Append-only log| HC
            DB -->|Key-value store| HB
            HC -->|Replicates data| P
        end
    end
```
