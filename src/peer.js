import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { crawlWebsites } from "./crawler.js";
import { core, getPageData } from "./db.js";
import { websites, peerId } from "./config.js";
import {
  getMyWebsites,
  registerPeerAssignment,
  findResponsiblePeer,
} from "./website-manager.js";

// Initialize swarm for peer discovery
const swarm = new Hyperswarm();
const topic = crypto
  .createHash("sha256")
  .update("p2p-crawler-network")
  .digest();

// Assigned websites this peer is responsible for
const myWebsites = getMyWebsites(websites);

// Map of connected peers
const peers = new Map();

// Join the swarm to find other peers
swarm.join(topic, { lookup: true, announce: true });

// Handle peer connections
swarm.on("connection", (socket, info) => {
  // Set up bidirectional replication
  const stream = core.replicate(socket);

  // Set up protocol handling
  const remotePeerId = info.peer?.toString("hex") || "unknown";
  console.log(`[Swarm] Connected to peer: ${remotePeerId}`);

  // Store connection for later use
  peers.set(remotePeerId, { socket, stream });

  // Exchange website assignment information
  sendMessage(socket, {
    type: "WEBSITES_ASSIGNMENT",
    peerId,
    websites: myWebsites,
  });

  // Handle messages from peers
  socket.on("data", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(remotePeerId, message);
    } catch (err) {
      // Not a JSON message, might be replication data
    }
  });

  // Handle disconnection
  socket.on("close", () => {
    console.log(`[Swarm] Peer disconnected: ${remotePeerId}`);
    peers.delete(remotePeerId);
  });
});

// Handle messages from peers
function handleMessage(peerId, message) {
  switch (message.type) {
    case "WEBSITES_ASSIGNMENT":
      console.log(
        `[Peer] Received assignments from ${message.peerId} for websites:`,
        message.websites
      );
      registerPeerAssignment(message.peerId, message.websites);
      break;

    case "REQUEST_DATA":
      handleDataRequest(peerId, message);
      break;
  }
}

// Handle requests for website data
async function handleDataRequest(peerId, message) {
  const { website } = message;

  // Check if we're responsible for this website
  if (myWebsites.includes(website)) {
    const data = await getPageData(website);
    if (data) {
      sendMessage(peers.get(peerId).socket, {
        type: "WEBSITE_DATA",
        website,
        data,
        timestamp: Date.now(),
      });
    }
  }
}

// Send a message to a peer
function sendMessage(socket, message) {
  socket.write(JSON.stringify(message));
}

// Request data for a website from the responsible peer
export async function requestWebsiteData(website) {
  const responsiblePeerId = findResponsiblePeer(website);
  if (!responsiblePeerId || responsiblePeerId === peerId) {
    // Either we don't know who has it or we have it
    return await getPageData(website);
  }

  const peerConnection = peers.get(responsiblePeerId);
  if (!peerConnection) {
    console.log(`[Peer] Responsible peer ${responsiblePeerId} not connected`);
    return null;
  }

  // Send request to the peer
  sendMessage(peerConnection.socket, {
    type: "REQUEST_DATA",
    website,
  });

  // TODO: Implement a proper request/response pattern with promises
  // For now, we just return null and let the data sync through Hypercore replication
  return null;
}

console.log(`[Peer] ${peerId} crawling:`, myWebsites);

// Start periodic crawling of assigned websites
setInterval(() => crawlWebsites(myWebsites), 30000); // every 30s
