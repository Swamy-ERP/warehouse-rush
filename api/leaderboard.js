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
    const ep = (() => {
      try {
        const store = require("../lib/store");
        const e = store.debugEndpoint();
        return e ? { host: e.url.replace(/^https?:\/\//, "").split("/")[0], hasToken: !!e.token } : null;
      } catch (err) {
        return { error: err.message };
      }
    })();
    body.debug = {
      kvUrl: process.env.KV_REST_API_URL ? "set" : null,
      kvToken: process.env.KV_REST_API_TOKEN ? "set" : null,
      redisUrl: process.env.REDIS_URL ? "set" : null,
      redisRestUrl: process.env.REDIS_REST_API_URL ? "set" : null,
      upstashUrl: process.env.UPSTASH_REDIS_REST_URL ? "set" : null,
      endpoint: ep,
    };
  }
  return res.status(200).json(body);
};
