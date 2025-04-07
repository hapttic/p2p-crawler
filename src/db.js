import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { join } from "path";

const core = new Hypercore(join("storage", "data"), { valueEncoding: "json" });
await core.ready();

const db = new Hyperbee(core, {
  keyEncoding: "utf-8",
  valueEncoding: "json",
});
await db.ready();

export async function storePageData(url, html) {
  const timestamp = Date.now();
  await db.put(url, { html, timestamp });
}

export async function getPageData(url) {
  const node = await db.get(url);
  return node?.value;
}

export { db, core };
