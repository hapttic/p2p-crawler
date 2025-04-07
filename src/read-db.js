import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";

// Load the same core used by the crawler
const core = new Hypercore(join("storage", "data"), { valueEncoding: "json" });
await core.ready();

const db = new Hyperbee(core, {
  keyEncoding: "utf-8",
  valueEncoding: "json",
});
await db.ready();

// Iterate over all key-value pairs
const iter = db.createReadStream();
for await (const { key, value } of iter) {
  console.log("🗂️", key, "\n📄", value.html?.slice(0, 200) + "...\n");
}
