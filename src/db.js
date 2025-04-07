import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";
import { URL } from "url";
import { storagePath, peerId } from "./config.js";

// Create a unique storage path for each peer
const peerStoragePath = join(storagePath, peerId, "data");
console.log(`[DB] Using storage path: ${peerStoragePath}`);

const core = new Hypercore(peerStoragePath, { valueEncoding: "json" });
await core.ready();
console.log(`[DB] Hypercore ready, public key: ${core.key.toString("hex")}`);

const db = new Hyperbee(core, {
  keyEncoding: "utf-8",
  valueEncoding: "json",
});
await db.ready();
console.log(`[DB] Hyperbee database ready`);

/**
 * Store page data in the database
 * @param {string} url - The URL of the page
 * @param {string} html - The HTML content
 * @param {object} metadata - Additional metadata (optional)
 */
export async function storePageData(url, html, metadata = {}) {
  const timestamp = Date.now();

  try {
    // Parse the URL to extract domain and path
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const path = parsedUrl.pathname + parsedUrl.search || "/";

    // Create a unique key for this URL in the database
    // Format: domain|path
    const dbKey = `${domain}|${path}`;

    // Store page data
    await db.put(dbKey, {
      url,
      html,
      timestamp,
      domain,
      path,
      ...metadata,
    });

    // Update the domain index with the list of crawled pages
    await updateDomainIndex(domain, dbKey);

    return dbKey;
  } catch (err) {
    console.error(`[DB] Error storing data for ${url}:`, err.message);
    // Fallback to the original URL as key if there's an error
    await db.put(url, { html, timestamp, ...metadata });
    return url;
  }
}

/**
 * Update the domain index with the new page
 * @param {string} domain - The domain name
 * @param {string} pageKey - The database key for the page
 */
async function updateDomainIndex(domain, pageKey) {
  const indexKey = `index|${domain}`;

  try {
    // Get existing index or create a new one
    const existing = await db.get(indexKey);
    const pages = existing?.value?.pages || [];

    // Add the new page if it doesn't exist
    if (!pages.includes(pageKey)) {
      pages.push(pageKey);
    }

    // Update the index
    await db.put(indexKey, {
      domain,
      pages,
      updated: Date.now(),
    });
  } catch (err) {
    console.error(
      `[DB] Error updating domain index for ${domain}:`,
      err.message
    );
  }
}

/**
 * Get page data from a specific URL
 * @param {string} url - The URL to retrieve
 * @returns {object} The page data or null
 */
export async function getPageData(url) {
  try {
    // Try to parse the URL and create the same key format used in storePageData
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const path = parsedUrl.pathname + parsedUrl.search || "/";
    const dbKey = `${domain}|${path}`;

    const node = await db.get(dbKey);
    return node?.value;
  } catch (err) {
    // Fallback to direct URL lookup if there's an error
    const node = await db.get(url);
    return node?.value;
  }
}

/**
 * Get all pages from a specific domain
 * @param {string} domain - The domain name
 * @returns {Array} Array of page data
 */
export async function getAllPagesForDomain(domain) {
  const indexKey = `index|${domain}`;
  const index = await db.get(indexKey);

  if (!index?.value?.pages || !index.value.pages.length) {
    return [];
  }

  const results = [];
  for (const pageKey of index.value.pages) {
    const page = await db.get(pageKey);
    if (page?.value) {
      results.push(page.value);
    }
  }

  return results;
}

/**
 * List all domains in the database
 * @returns {Array} Array of domain names with page counts
 */
export async function listDomains() {
  const domains = [];
  const prefix = "index|";
  const stream = db.createReadStream({ gt: prefix, lt: prefix + "\uffff" });

  for await (const { key, value } of stream) {
    domains.push({
      domain: value.domain,
      pageCount: value.pages.length,
      lastUpdated: value.updated,
    });
  }

  return domains;
}

export { db, core };
