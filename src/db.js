import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";
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

export async function storePageData(url, html) {
  const timestamp = Date.now();
  await db.put(url, { html, timestamp });
}

export async function getPageData(url) {
  const node = await db.get(url);
  return node?.value;
}

export { db, core };
