import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { crawlWebsites } from "./crawler.js";
import { core, getPageData, getAllPagesForDomain } from "./db.js";
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

    case "REQUEST_DOMAIN_PAGES":
      handleDomainPagesRequest(peerId, message);
      break;
  }
}

// Handle requests for website data
async function handleDataRequest(peerId, message) {
  const { website } = message;

  // Check if we're responsible for this website or its domain
  const websiteDomain = extractDomain(website);
  const isResponsible = myWebsites.some((myUrl) => {
    return myUrl === website || extractDomain(myUrl) === websiteDomain;
  });

  if (isResponsible) {
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

// Handle requests for all pages of a domain
async function handleDomainPagesRequest(peerId, message) {
  const { domain } = message;

  // Check if we're responsible for any website in this domain
  const isResponsible = myWebsites.some(
    (myUrl) => extractDomain(myUrl) === domain
  );

  if (isResponsible) {
    const pages = await getAllPagesForDomain(domain);

    sendMessage(peers.get(peerId).socket, {
      type: "DOMAIN_PAGES",
      domain,
      pages,
      timestamp: Date.now(),
    });

    console.log(
      `[Peer] Sent ${pages.length} pages for domain ${domain} to peer ${peerId}`
    );
  }
}

// Extract domain from a URL
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (err) {
    return null;
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

// Request all pages for a domain from the responsible peer
export async function requestDomainPages(domain) {
  // Find a peer responsible for this domain
  let responsiblePeerId = null;

  // Check if any of our known peers is responsible for this domain
  for (const [otherPeerId, assignedSites] of Object.entries(
    getAllAssignments()
  )) {
    if (otherPeerId === peerId) continue; // Skip ourselves

    const isResponsible = assignedSites.some(
      (site) => extractDomain(site) === domain
    );
    if (isResponsible) {
      responsiblePeerId = otherPeerId;
      break;
    }
  }

  if (!responsiblePeerId) {
    // We don't know who has it, try to find it locally
    return await getAllPagesForDomain(domain);
  }

  if (responsiblePeerId === peerId) {
    // We have it
    return await getAllPagesForDomain(domain);
  }

  const peerConnection = peers.get(responsiblePeerId);
  if (!peerConnection) {
    console.log(`[Peer] Responsible peer ${responsiblePeerId} not connected`);
    return [];
  }

  // Send request to the peer
  sendMessage(peerConnection.socket, {
    type: "REQUEST_DOMAIN_PAGES",
    domain,
  });

  // TODO: Implement a proper request/response pattern with promises
  // For now, we just return an empty array and let the data sync through Hypercore replication
  return [];
}

console.log(`[Peer] ${peerId} crawling:`, myWebsites);

// Start periodic crawling of assigned websites
setInterval(() => crawlWebsites(myWebsites), 30000); // every 30s
