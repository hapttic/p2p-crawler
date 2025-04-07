import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { once } from "events";

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

// Handle command line arguments
const websiteUrl = process.argv[2];
if (!websiteUrl) {
  console.error("Please provide a website URL as the first argument");
  console.error("Example: node src/standalone-client.js https://example.com");
  process.exit(1);
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

// Main function
async function main() {
  console.log("P2P Web Crawler Standalone Client");
  console.log("=================================\n");

  console.log(`Connecting to P2P network as ${clientId}...`);
  console.log(`Requesting data for: ${websiteUrl}\n`);

  // Wait briefly for connections to establish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Request the data
  const data = await requestWebsiteData(websiteUrl);

  if (data) {
    console.log("✅ Successfully retrieved data:");
    console.log(`Last updated: ${new Date(data.timestamp).toLocaleString()}`);
    console.log(`Content preview: ${data.html.slice(0, 200)}...\n`);
  } else {
    console.log("❌ Could not retrieve data for the website");
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
