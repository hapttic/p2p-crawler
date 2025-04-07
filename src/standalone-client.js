import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { once } from "events";
import { URL } from "url";

/**
 * Standalone client for P2P web crawler
 *
 * This client connects to the P2P network and requests website data
 * without having to directly access the database. It uses a request/response
 * pattern over the P2P network.
 *
 * Run this after starting the main crawler:
 * npm start
 *
 * Then in another terminal:
 * node src/standalone-client.js https://example.com
 *
 * Or to get all pages from a domain:
 * node src/standalone-client.js --domain example.com
 */

// Create a random client ID
const clientId = "client-" + Math.random().toString(36).slice(2);

// Initialize the swarm for discovery
const swarm = new Hyperswarm();

// Use the same topic as the main crawler
const topic = crypto
  .createHash("sha256")
  .update("p2p-crawler-network")
  .digest();

// Keep track of connected peers
const connectedPeers = new Map();

// Set up promise resolution for data responses
const pendingRequests = new Map();

// Parse command line arguments
let targetUrl = null;
let targetDomain = null;
let requestAllPages = false;

if (process.argv[2] === "--domain" && process.argv[3]) {
  // Domain mode - request all pages from a domain
  targetDomain = process.argv[3];
  requestAllPages = true;
} else {
  // URL mode - request a specific URL
  targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error(
      "Please provide a website URL or use --domain to request all pages from a domain"
    );
    console.error("Examples:");
    console.error("  node src/standalone-client.js https://example.com");
    console.error("  node src/standalone-client.js --domain example.com");
    process.exit(1);
  }

  // Extract domain from URL
  try {
    const parsedUrl = new URL(targetUrl);
    targetDomain = parsedUrl.hostname;
  } catch (err) {
    console.error(
      "Invalid URL provided. Please enter a valid URL including protocol (http/https)"
    );
    process.exit(1);
  }
}

// Join the swarm to find peers
swarm.join(topic, { lookup: true, announce: false });

// Handle new connections
swarm.on("connection", (socket, info) => {
  const remotePeerId = info.peer?.toString("hex") || "unknown";
  console.log(`Connected to peer: ${remotePeerId}`);

  // Store the connection
  connectedPeers.set(remotePeerId, socket);

  // Handle incoming messages
  socket.on("data", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(remotePeerId, message);
    } catch (err) {
      // Not a JSON message or error parsing
    }
  });

  // Handle disconnection
  socket.on("close", () => {
    console.log(`Peer disconnected: ${remotePeerId}`);
    connectedPeers.delete(remotePeerId);
  });
});

// Handle incoming messages
function handleMessage(peerId, message) {
  switch (message.type) {
    case "WEBSITE_DATA":
      // Resolve the pending request for this website
      const resolver = pendingRequests.get(message.website);
      if (resolver) {
        resolver(message.data);
        pendingRequests.delete(message.website);
      }
      break;

    case "DOMAIN_PAGES":
      // Resolve the pending request for this domain
      const domainResolver = pendingRequests.get(`domain:${message.domain}`);
      if (domainResolver) {
        domainResolver(message.pages);
        pendingRequests.delete(`domain:${message.domain}`);
      }
      break;

    case "WEBSITES_ASSIGNMENT":
      console.log(`Received assignments from ${message.peerId}:`);
      console.log(message.websites);
      break;
  }
}

// Send a message to a peer
function sendMessage(socket, message) {
  socket.write(JSON.stringify(message));
}

// Request data for a website from the P2P network
async function requestWebsiteData(websiteUrl) {
  if (connectedPeers.size === 0) {
    console.log("No peers connected. Waiting for connections...");
    await once(swarm, "connection");
  }

  console.log(
    `Requesting data for ${websiteUrl} from ${connectedPeers.size} peers`
  );

  // Create a promise that will be resolved when we get a response
  const dataPromise = new Promise((resolve) => {
    pendingRequests.set(websiteUrl, resolve);

    // Send request to all connected peers
    for (const [peerId, socket] of connectedPeers.entries()) {
      console.log(`Sending request to peer ${peerId}`);
      sendMessage(socket, {
        type: "REQUEST_DATA",
        website: websiteUrl,
        clientId,
      });
    }

    // Set a timeout to resolve with null if no response
    setTimeout(() => {
      if (pendingRequests.has(websiteUrl)) {
        console.log("Request timed out");
        pendingRequests.delete(websiteUrl);
        resolve(null);
      }
    }, 10000); // 10 second timeout
  });

  return await dataPromise;
}

// Request all pages for a domain from the P2P network
async function requestDomainPages(domain) {
  if (connectedPeers.size === 0) {
    console.log("No peers connected. Waiting for connections...");
    await once(swarm, "connection");
  }

  console.log(
    `Requesting all pages for domain ${domain} from ${connectedPeers.size} peers`
  );

  // Create a promise that will be resolved when we get a response
  const dataPromise = new Promise((resolve) => {
    pendingRequests.set(`domain:${domain}`, resolve);

    // Send request to all connected peers
    for (const [peerId, socket] of connectedPeers.entries()) {
      console.log(`Sending domain request to peer ${peerId}`);
      sendMessage(socket, {
        type: "REQUEST_DOMAIN_PAGES",
        domain: domain,
        clientId,
      });
    }

    // Set a timeout to resolve with empty array if no response
    setTimeout(() => {
      if (pendingRequests.has(`domain:${domain}`)) {
        console.log("Request timed out");
        pendingRequests.delete(`domain:${domain}`);
        resolve([]);
      }
    }, 15000); // 15 second timeout (domain requests might take longer)
  });

  return await dataPromise;
}

// Main function
async function main() {
  console.log("P2P Web Crawler Standalone Client");
  console.log("=================================\n");

  console.log(`Connecting to P2P network as ${clientId}...`);

  if (requestAllPages) {
    console.log(`Requesting all pages for domain: ${targetDomain}\n`);
  } else {
    console.log(`Requesting data for specific URL: ${targetUrl}\n`);
  }

  // Wait briefly for connections to establish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Request the data
  if (requestAllPages) {
    const pages = await requestDomainPages(targetDomain);

    if (pages && pages.length > 0) {
      console.log(
        `✅ Successfully retrieved ${pages.length} pages for ${targetDomain}:`
      );

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        console.log(`\n[Page ${i + 1}/${pages.length}] ${page.url}`);
        console.log(
          `Last updated: ${new Date(page.timestamp).toLocaleString()}`
        );
        console.log(`Path: ${page.path}`);
        console.log(`Content preview: ${page.html.slice(0, 100)}...\n`);
      }
    } else {
      console.log(`❌ Could not retrieve pages for domain ${targetDomain}`);
    }
  } else {
    const data = await requestWebsiteData(targetUrl);

    if (data) {
      console.log("✅ Successfully retrieved data:");
      console.log(`Last updated: ${new Date(data.timestamp).toLocaleString()}`);
      console.log(`Content preview: ${data.html.slice(0, 200)}...\n`);
    } else {
      console.log("❌ Could not retrieve data for the website");
    }
  }

  // Clean up and exit
  console.log("Closing connections...");
  for (const socket of connectedPeers.values()) {
    socket.end();
  }
  await swarm.destroy();
  console.log("Client closed");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
