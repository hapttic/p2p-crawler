import { getPageData } from "./db.js";
import { requestWebsiteData } from "./peer.js";
import { findResponsiblePeer } from "./website-manager.js";

/**
 * Get the content of a website from the P2P network
 *
 * This function will:
 * 1. Check if we have the data locally
 * 2. If not, try to find a peer that is responsible for the website
 * 3. Request the data from that peer
 *
 * @param {string} websiteUrl - The URL of the website to get
 * @param {object} options - Options
 * @param {boolean} options.forceRefresh - Whether to force refresh from the responsible peer
 * @returns {Promise<object>} - The website data or null
 */
export async function getWebsiteContent(websiteUrl, options = {}) {
  const { forceRefresh = false } = options;

  // First, check if we have the data locally and don't need a refresh
  if (!forceRefresh) {
    const localData = await getPageData(websiteUrl);
    if (localData) {
      console.log(`[Client] Using local data for ${websiteUrl}`);
      return localData;
    }
  }

  // Find which peer is responsible for this website
  const responsiblePeer = findResponsiblePeer(websiteUrl);

  if (!responsiblePeer) {
    console.log(`[Client] No peer assigned to ${websiteUrl}`);
    // No peer is responsible, we could fall back to crawling it ourselves
    return null;
  }

  console.log(`[Client] Requesting ${websiteUrl} from peer ${responsiblePeer}`);

  // Request the data from the responsible peer
  return await requestWebsiteData(websiteUrl);
}

/**
 * Example usage of the client
 */
async function example() {
  // Wait for the P2P network to connect
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Try to get a website
  const websiteUrl = "https://docs.pears.com/";
  const data = await getWebsiteContent(websiteUrl);

  if (data) {
    console.log(`[Example] Got data for ${websiteUrl}`, {
      timestamp: data.timestamp,
      contentPreview: data.html.slice(0, 100) + "...",
    });
  } else {
    console.log(`[Example] Could not get data for ${websiteUrl}`);
  }
}

// Run the example if this file is executed directly
if (process.argv[1].endsWith("client.js")) {
  example().catch(console.error);
}
