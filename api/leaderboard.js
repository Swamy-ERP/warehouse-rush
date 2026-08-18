/* GET /api/leaderboard — returns the shared Top 10. */
const { load } = require("../lib/store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const entries = await load();
  return res.status(200).json({ entries });
};
