import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";
import { storagePath } from "./config.js";

// Allow specifying a peer ID via command line argument
const targetPeerId = process.argv[2] || process.env.PEER_ID;
const targetDomain = process.argv[3]; // Optional domain to filter by

if (!targetPeerId) {
  console.error(
    "Please specify a peer ID as the first argument or set PEER_ID in the .env file"
  );
  process.exit(1);
}

// Load data from the specified peer's storage
const peerStoragePath = join(storagePath, targetPeerId, "data");
console.log(`Reading database from: ${peerStoragePath}`);

// Load the core used by the specified peer
const core = new Hypercore(peerStoragePath, { valueEncoding: "json" });
await core.ready();
console.log(`Hypercore key: ${core.key.toString("hex")}`);

const db = new Hyperbee(core, {
  keyEncoding: "utf-8",
  valueEncoding: "json",
});
await db.ready();

// Function to display database information
async function displayDatabase() {
  if (targetDomain) {
    await displayDomainPages(targetDomain);
  } else {
    await displayDomainList();
  }
}

// Display list of all domains in the database
async function displayDomainList() {
  console.log(`\nDomains in ${targetPeerId}'s database:`);
  console.log("=====================================\n");

  // List domains (entries starting with "index|")
  const domains = [];
  const indexStream = db.createReadStream({ gt: "index|", lt: "index|\uffff" });

  let count = 0;
  for await (const { key, value } of indexStream) {
    count++;
    const domain = key.split("|")[1];
    console.log(`Domain: ${domain}`);
    console.log(`Pages: ${value.pages.length}`);
    console.log(`Last Updated: ${new Date(value.updated).toLocaleString()}`);
    console.log("");
  }

  if (count === 0) {
    console.log("No domains found in the database.");
  } else {
    console.log(
      `To view pages for a specific domain, run:\nnode src/read-db.js ${targetPeerId} example.com`
    );
  }
}

// Display all pages for a specific domain
async function displayDomainPages(domain) {
  console.log(`\nPages for domain ${domain} in ${targetPeerId}'s database:`);
  console.log("=================================================\n");

  // Get the domain index
  const indexKey = `index|${domain}`;
  const index = await db.get(indexKey);

  if (!index?.value) {
    console.log(`No data found for domain ${domain}.`);
    return;
  }

  console.log(`Found ${index.value.pages.length} pages for ${domain}\n`);

  // Iterate through pages
  let pageNum = 1;
  for (const pageKey of index.value.pages) {
    const page = await db.get(pageKey);
    if (page?.value) {
      console.log(`Page ${pageNum++}: ${page.value.url}`);
      console.log(`Path: ${page.value.path}`);
      console.log(
        `Last Crawled: ${new Date(page.value.timestamp).toLocaleString()}`
      );
      console.log(`Content Preview: ${page.value.html.slice(0, 150)}...\n`);
    }
  }
}

// Display all pages if no domain specified
async function displayAllPages() {
  console.log(`\nAll pages in ${targetPeerId}'s database:`);
  console.log("=====================================\n");

  const stream = db.createReadStream();

  let count = 0;
  for await (const { key, value } of stream) {
    // Skip index entries
    if (key.startsWith("index|")) continue;

    count++;
    console.log(`URL: ${value.url || key}`);
    if (value.domain) console.log(`Domain: ${value.domain}`);
    if (value.path) console.log(`Path: ${value.path}`);
    console.log(`Last Updated: ${new Date(value.timestamp).toLocaleString()}`);
    console.log(`Content Preview: ${value.html?.slice(0, 150)}...\n`);
  }

  if (count === 0) {
    console.log("No pages found in the database.");
  }
}

// Run the display function
await displayDatabase();

// Close the database
await core.close();
