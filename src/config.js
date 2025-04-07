import dotenv from "dotenv";
dotenv.config();

const websites = process.env.WEBSITES?.split(",") || [];
const peerId =
  process.env.PEER_ID || "peer-" + Math.random().toString(36).slice(2);

export { websites, peerId };
