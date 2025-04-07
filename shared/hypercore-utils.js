import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import { once } from "events";

export async function readRemoteData(coreKey, url) {
  const feed = new Hypercore("./remote", coreKey, { valueEncoding: "json" });
  await once(feed, "ready");
  const db = new Hyperbee(feed, {
    keyEncoding: "utf-8",
    valueEncoding: "json",
  });
  await db.ready();
  const node = await db.get(url);
  return node?.value;
}
