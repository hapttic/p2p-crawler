import crypto from "crypto";
import { peerId } from "./config.js";

// Each peer can handle a maximum of 5 websites
const MAX_WEBSITES_PER_PEER = 5;

// Map to store peer assignments
// Format: { websiteUrl: { peerId, lastUpdated } }
const websiteAssignments = new Map();

// Get hash of website URL to determine assignment
function getWebsiteHash(url) {
  return crypto.createHash("sha256").update(url).digest("hex");
}

// Assign websites to this peer based on peerId
export function getMyWebsites(allWebsites) {
  // For deterministic assignment, we'll use the peerId and website hash
  const myWebsites = [];

  for (const website of allWebsites) {
    const websiteHash = getWebsiteHash(website);
    // Simple assignment algorithm - if hash ends with peer's last two chars
    // or if there are few websites, assign them to this peer
    if (
      websiteHash.endsWith(peerId.slice(-2)) ||
      allWebsites.length <= MAX_WEBSITES_PER_PEER
    ) {
      myWebsites.push(website);

      // Record the assignment
      websiteAssignments.set(website, {
        peerId,
        lastUpdated: Date.now(),
      });

      // Limit to MAX_WEBSITES_PER_PEER
      if (myWebsites.length >= MAX_WEBSITES_PER_PEER) break;
    }
  }

  return myWebsites;
}

// Register website assignments from other peers
export function registerPeerAssignment(peer, websites) {
  for (const website of websites) {
    websiteAssignments.set(website, {
      peerId: peer,
      lastUpdated: Date.now(),
    });
  }
}

// Find which peer is responsible for a website
export function findResponsiblePeer(website) {
  return websiteAssignments.get(website)?.peerId;
}

// Get all websites assigned to a specific peer
export function getWebsitesByPeer(peer) {
  const websites = [];
  for (const [website, assignment] of websiteAssignments.entries()) {
    if (assignment.peerId === peer) {
      websites.push(website);
    }
  }
  return websites;
}

// Get all current assignments
export function getAllAssignments() {
  return Object.fromEntries(websiteAssignments);
}
