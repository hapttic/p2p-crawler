import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";
import { storagePath } from "./config.js";

// Allow specifying a peer ID via command line argument
const targetPeerId = process.argv[2] || process.env.PEER_ID;

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

// Iterate over all key-value pairs
console.log(`\nContents of ${targetPeerId}'s database:`);
console.log("=====================================\n");

const iter = db.createReadStream();
let count = 0;
for await (const { key, value } of iter) {
  count++;
  console.log(`Website: ${key}`);
  console.log(`Last updated: ${new Date(value.timestamp).toLocaleString()}`);
  console.log(`Content preview: ${value.html?.slice(0, 200)}...\n`);
}

if (count === 0) {
  console.log("No data found in the database.");
}

// Close the database
await core.close();
