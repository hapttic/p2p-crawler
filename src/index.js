import { peerId, websites } from "./config.js";
import { crawlWebsites } from "./crawler.js";
import { getMyWebsites, getAllAssignments } from "./website-manager.js";
import { requestWebsiteData } from "./peer.js";
import { getPageData } from "./db.js";

// Import peer module to initialize the P2P network
import "./peer.js";

/**
 * P2P Web Crawler System
 *
 * This system creates a network of peers where each peer is responsible for
 * crawling a subset of websites. The data is shared through the P2P network,
 * so any peer can access data from websites it's not directly responsible for.
 */

// Give some time for peers to connect and exchange assignments
setTimeout(async () => {
  console.log("\n========================================");
  console.log(`Peer ${peerId} is running`);
  console.log("========================================");

  // Show my assigned websites
  const myWebsites = getMyWebsites(websites);
  console.log(`\nResponsible for crawling ${myWebsites.length} websites:`);
  myWebsites.forEach((website) => console.log(`- ${website}`));

  // Show all known website assignments
  console.log("\nKnown website assignments:");
  const assignments = getAllAssignments();
  Object.entries(assignments).forEach(([website, { peerId }]) => {
    console.log(`- ${website} → ${peerId}`);
  });

  // Do an initial crawl of our assigned websites
  console.log("\nStarting initial crawl of assigned websites...");
  await crawlWebsites(myWebsites);

  // Example: Requesting data for a website we don't crawl
  const targetWebsite =
    websites.find((w) => !myWebsites.includes(w)) || websites[0];

  if (targetWebsite) {
    console.log(`\nTesting data request for ${targetWebsite}...`);

    // Try to get local data first
    let data = await getPageData(targetWebsite);
    console.log(`Local data available: ${!!data}`);

    if (!data) {
      // Try to request from the responsible peer
      console.log("Requesting from responsible peer...");
      data = await requestWebsiteData(targetWebsite);
      console.log(`Peer data available: ${!!data}`);
    }
  }

  console.log("\n========================================");
  console.log("P2P Web Crawler is running");
  console.log("Each peer will crawl its assigned websites");
  console.log("and share data with other peers");
  console.log("========================================\n");
}, 3000);
