import fetch from "node-fetch";
import { websites } from "./config.js";

/**
 * This example demonstrates how to use the P2P web crawler to retrieve website content
 *
 * Run this script after starting the main application:
 * npm start
 *
 * Then in another terminal:
 * node src/example.js
 */

// Create a lightweight client function that doesn't require direct DB access
async function getWebsiteContent(websiteUrl, options = {}) {
  const { forceRefresh = false } = options;
  console.log(`[Client] Requesting content for ${websiteUrl}`);

  try {
    // Make a direct web request to simulate getting content
    // In a real implementation, you would communicate with the main process
    const response = await fetch(websiteUrl);
    const html = await response.text();

    return {
      html,
      timestamp: Date.now(),
      source: "direct-fetch",
    };
  } catch (err) {
    console.error(`[Client] Error fetching ${websiteUrl}:`, err.message);
    return null;
  }
}

async function runExample() {
  console.log("P2P Web Crawler Example");
  console.log("======================\n");

  if (websites.length === 0) {
    console.log(
      "No websites configured. Please add websites to your .env file."
    );
    return;
  }

  // Choose a random website from the list
  const randomIndex = Math.floor(Math.random() * websites.length);
  const targetWebsite = websites[randomIndex];

  console.log(`Requesting content for: ${targetWebsite}`);
  console.log(
    "This will fetch the website content directly (not using the P2P network)"
  );
  console.log(
    "To use the P2P network, the proper approach is to send messages to the main process"
  );

  // First try without forcing refresh
  console.log("\n1. Regular request:");
  const data = await getWebsiteContent(targetWebsite);

  if (data) {
    console.log(`✅ Successfully retrieved data for ${targetWebsite}`);
    console.log(
      `   Last updated: ${new Date(data.timestamp).toLocaleString()}`
    );
    console.log(`   Content preview: ${data.html.slice(0, 150)}...`);
  } else {
    console.log(`❌ Could not retrieve data for ${targetWebsite}`);
  }

  // Then try with forced refresh
  console.log("\n2. Forced refresh request:");
  const refreshedData = await getWebsiteContent(targetWebsite, {
    forceRefresh: true,
  });

  if (refreshedData) {
    console.log(
      `✅ Successfully retrieved refreshed data for ${targetWebsite}`
    );
    console.log(
      `   Last updated: ${new Date(refreshedData.timestamp).toLocaleString()}`
    );
    console.log(`   Content preview: ${refreshedData.html.slice(0, 150)}...`);
  } else {
    console.log(`❌ Could not retrieve refreshed data for ${targetWebsite}`);
  }

  console.log("\nExample complete!");
}

runExample().catch((err) => {
  console.error("Error in example:", err);
  process.exit(1);
});
