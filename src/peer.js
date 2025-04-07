import Hyperswarm from "hyperswarm";
import crypto from "crypto";
import { crawlWebsites } from "./crawler.js";
import { core, getPageData } from "./db.js";
import { websites, peerId } from "./config.js";

const swarm = new Hyperswarm();
const topic = crypto
  .createHash("sha256")
  .update("p2p-crawler-network")
  .digest();

swarm.join(topic, { lookup: true, announce: true });

swarm.on("connection", (socket) => {
  core.replicate(socket);
  console.log(`[Swarm] Peer connected`);
});

console.log(`[Peer] ${peerId} crawling:`, websites);

// Start periodic crawling
setInterval(() => crawlWebsites(websites), 10000); // every 10s
