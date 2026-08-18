/* GET /api/leaderboard — returns the shared Top 10.
   Debug: send header x-wr-debug: 1 to reveal the storage backend. */
const { load, debugBackend, redisPing } = require("../lib/store");

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
      backend: debugBackend(),
      redisPing: process.env.REDIS_URL ? await redisPing() : null,
    };
  }
  return res.status(200).json(body);
};
