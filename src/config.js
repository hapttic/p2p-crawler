import dotenv from "dotenv";
import { join } from "path";
dotenv.config();

const websites = process.env.WEBSITES?.split(",") || [];
const peerId =
  process.env.PEER_ID || "peer-" + Math.random().toString(36).slice(2);
const storagePath = process.env.STORAGE_PATH || join("storage");

export { websites, peerId, storagePath };
