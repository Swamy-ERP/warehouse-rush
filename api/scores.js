/* POST /api/scores — add a score (name, score, rounds).
   DELETE /api/scores — with a JSON body {name, score?, at?} remove matching
   entries only; with no body clear the whole shared board. */
const { load, add, remove, clear, cleanName } = require("../lib/store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method === "DELETE") {
    const body = req.body && Object.keys(req.body).length ? req.body : {};
    const hasFilters = body.name !== undefined || body.score !== undefined || body.at !== undefined;
    if (hasFilters) {
      const filters = {
        name: body.name !== undefined ? cleanName(body.name) : undefined,
        score: body.score !== undefined ? Number(body.score) : undefined,
        at: body.at !== undefined ? String(body.at) : undefined,
      };
      const before = await load();
      const entries = await remove(filters);
      const removed = before.length - entries.length;
      return res.status(200).json({ entries, removed });
    }
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
