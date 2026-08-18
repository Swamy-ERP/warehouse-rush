/* Warehouse Rush — shared leaderboard storage for the Vercel functions.
 *
 * Keeps a Top-10 in memory, and optionally persists to Upstash Redis
 * (free tier) when these env vars are set in the Vercel project:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * Without them the board works but resets when the function cold-starts.
 */
const LIMIT = 10;
const MAX_NAME = 24;
const KEY = "warehouse_rush_scores";

let memory = [];

function cleanName(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "")
    .replace(/[<>"'&]/g, "") // strip HTML-special chars (client also escapes)
    .trim()
    .slice(0, MAX_NAME);
}

async function load() {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const res = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/get/${KEY}`,
        { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } }
      );
      const json = await res.json();
      const parsed = json && json.result ? JSON.parse(json.result) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      /* fall back to in-memory */
    }
  }
  return memory;
}

async function save(list) {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(JSON.stringify(list)),
      });
    } catch (err) {
      /* keep in-memory copy */
    }
  }
  memory = list;
}

async function add(name, score, rounds) {
  const list = await load();
  list.push({
    name,
    score,
    rounds,
    at: new Date().toISOString(),
  });
  list.sort((a, b) => b.score - a.score || new Date(b.at) - new Date(a.at));
  const next = list.slice(0, LIMIT);
  await save(next);
  return next;
}

async function clear() {
  await save([]);
  return [];
}

module.exports = { load, add, clear, cleanName, LIMIT };
