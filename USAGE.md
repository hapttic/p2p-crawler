# P2P Web Crawler: Sharing & Using Data

This guide explains how to use the P2P Web Crawler network to share your crawled websites with others and use data crawled by other peers.

## Quick Start

### Joining the Network with Your Own Websites

1. **Install the crawler**:

   ```bash
   git clone https://github.com/your-username/p2p-crawler.git
   cd p2p-crawler
   npm install
   ```

2. **Configure your websites**:
   Create a `.env` file:

   ```
   # List the websites you're already crawling
   WEBSITES=https://yoursite1.com,https://yoursite2.com,https://yoursite3.com

   # Optional: Set a custom peer ID (otherwise randomly generated)
   PEER_ID=your_name_crawler
   ```

3. **Start sharing your data**:

   ```bash
   npm start
   ```

   Your crawler will now:

   - Connect to the P2P network
   - Announce which websites you're responsible for
   - Begin sharing your data with others
   - Automatically crawl your sites periodically to keep data fresh

### Accessing Data From Other Peers

To retrieve websites that other peers are crawling:

1. **Use the standalone client**:

   ```bash
   npm run standalone https://website-someone-else-crawls.com
   ```

2. **Or programmatically**:

   ```javascript
   import { getWebsiteContent } from "./src/client.js";

   // This will find the peer responsible for this website
   // and get the data from them automatically
   const data = await getWebsiteContent(
     "https://website-someone-else-crawls.com"
   );
   console.log(data.html); // The website content
   ```

## How It Works

When you run the crawler:

1. It assigns you websites based on your peer ID (up to 5 per peer)
2. It joins the P2P network and announces which sites you're crawling
3. Other peers discover you and know which websites you have data for
4. When someone needs data for a website you crawl, their request comes to you
5. You automatically share your crawled data with them

## Advanced Usage

### Running Multiple Peers

If you want to crawl different website sets from the same machine:

```bash
# Terminal 1: First set of websites
PEER_ID=crawler1 WEBSITES=https://site1.com,https://site2.com npm start

# Terminal 2: Second set of websites
PEER_ID=crawler2 WEBSITES=https://site3.com,https://site4.com npm start
```

### Building Apps on the Network

You can build applications that leverage the crawler network:

```javascript
// Get data from any website in the network
import { getWebsiteContent } from "./src/client.js";

async function myApp() {
  // The P2P network automatically finds who has this data
  const site1Data = await getWebsiteContent("https://site1.com");
  const site2Data = await getWebsiteContent("https://site2.com");

  // Process the data however you want
  // ...
}
```

### Adding More Websites

To start crawling additional websites:

1. Update your `.env` file with new websites
2. Restart your crawler
3. The network will automatically update assignments

## Common Questions

### How many websites can I crawl?

Each peer can effectively crawl up to 5 websites. If you need to crawl more, run multiple peers with different PEER_ID values.

### How often is data refreshed?

By default, each website is crawled every 30 seconds. You can adjust this interval in the `peer.js` file.

### What if two peers claim the same website?

The system uses a deterministic assignment algorithm based on peer IDs and website URLs. If there's a conflict, the peer with the ID that better matches the website hash will take responsibility.

### How do I know which peers are crawling which websites?

Run the crawler and check the console output. It will show:

- Which websites you're responsible for
- Known assignments of all websites in the network

### Can I manually assign websites?

Yes. Edit the `website-manager.js` file to customize the assignment algorithm, or manually assign websites in your code by modifying the `getMyWebsites` function.

## Real-World Example

**Scenario**: You run a personal news aggregator and want to contribute to a community of crawlers.

1. **Your contribution**: You crawl 3 news sites you're interested in

   ```
   WEBSITES=https://technews.com,https://financenews.com,https://sportsnews.com
   PEER_ID=news_crawler_alice
   ```

2. **Your benefit**: You get access to dozens of other news sites being crawled by the community without having to crawl them yourself

3. **Network effect**: The more people join and share, the more valuable the network becomes for everyone

## Troubleshooting

### No peers found

If you're not connecting to other peers:

- Make sure your internet connection allows P2P traffic
- Check that you're using the same network topic (in `peer.js`)
- Try running on a different network

### Cannot get website data

If you can't retrieve data for a website:

- Verify someone in the network is actually crawling it
- Check that the peer is online
- Ensure the website URL format matches exactly
