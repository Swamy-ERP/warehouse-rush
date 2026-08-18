/* POST /api/scores — add a score (name, score, rounds).
   DELETE /api/scores — clear the shared board. */
const { add, clear, cleanName } = require("../lib/store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method === "DELETE") {
    const entries = await clear();
    return res.status(200).json({ entries });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body || {};
  const name = cleanName(body.name);
  const score = Number(body.score);
  const rounds = Number(body.rounds);
  if (!name || !Number.isInteger(score) || score <= 0) {
    return res.status(400).json({ error: "invalid entry" });
  }
  const entries = await add(name, score, Number.isInteger(rounds) && rounds >= 0 ? rounds : 0);
  return res.status(200).json({ entries });
};
