import { storePageData } from "./db.js";
import fetch from "node-fetch";

export async function crawlWebsites(websites) {
  for (const url of websites) {
    try {
      const res = await fetch(url);
      const html = await res.text();
      await storePageData(url, html);
      console.log(`[Crawler] Stored ${url}`);
    } catch (err) {
      console.error(`[Crawler] Failed to crawl ${url}:`, err.message);
    }
  }
}
