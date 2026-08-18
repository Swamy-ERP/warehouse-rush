/* GET /api/leaderboard — returns the shared Top 10.
   Debug: send header x-wr-debug: 1 to reveal whether KV env vars are set. */
const { load } = require("../lib/store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const entries = await load();
  const body = { entries };
  if (req.headers["x-wr-debug"]) {
    body.debug = {
      kvUrl: process.env.KV_REST_API_URL ? String(process.env.KV_REST_API_URL).slice(0, 60) : null,
      kvToken: process.env.KV_REST_API_TOKEN ? "set" : null,
      upstashUrl: process.env.UPSTASH_REDIS_REST_URL ? String(process.env.UPSTASH_REDIS_REST_URL).slice(0, 60) : null,
    };
  }
  return res.status(200).json(body);
};
