/* Warehouse Rush — shared leaderboard storage for the Vercel functions.
 *
 * Keeps a Top-10 in memory, and optionally persists to a Redis-compatible
 * REST store when env vars are present:
 *   - Vercel KV (recommended): KV_REST_API_URL, KV_REST_API_TOKEN
 *     (set automatically when a KV database is linked in the Vercel
 *     dashboard — Storage → Create Database → KV/Redis → connect to
 *     this project. Vercel adds the env vars and redeploys for you.)
 *   - Upstash Redis (free tier): UPSTASH_REDIS_REST_URL,
 *     UPSTASH_REDIS_REST_TOKEN
 * Without either the board works but resets when the function cold-starts.
 */
const LIMIT = 10;
const MAX_NAME = 24;
const KEY = "warehouse_rush_scores";

let memory = [];

/* Vercel Redis connection strings look like
   rediss://default:<token>@<host>:6379 — the host also serves the REST
   API (Upstash-style) and the password is the REST bearer token, so we
   can persist with zero extra dependencies. */
function parseRedisUrl(url) {
  const m = /^rediss?:\/\/[^:]*:([^@]+)@([^/:]+)(?::\d+)?(?:\/.*)?$/.exec(url);
  if (!m) {
    return null;
  }
  const token = (() => {
    try {
      return decodeURIComponent(m[1]);
    } catch (err) {
      return m[1];
    }
  })();
  return { url: `https://${m[2]}`, token };
}

function restEndpoint() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  if (process.env.REDIS_REST_API_URL && process.env.REDIS_REST_API_TOKEN) {
    return { url: process.env.REDIS_REST_API_URL, token: process.env.REDIS_REST_API_TOKEN };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }
  if (process.env.REDIS_URL) {
    return parseRedisUrl(process.env.REDIS_URL);
  }
  return null;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "")
    .replace(/[<>"'&]/g, "") // strip HTML-special chars (client also escapes)
    .trim()
    .slice(0, MAX_NAME);
}

async function load() {
  const rest = restEndpoint();
  if (rest) {
    try {
      const res = await fetch(`${rest.url}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${rest.token}` },
      });
      const json = await res.json();
      let parsed = json && json.result ? JSON.parse(json.result) : [];
      if (typeof parsed === "string") {
        // Defensive: if the store round-trips the value as a JSON string,
        // parse once more. Also migrates any legacy double-encoded data.
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      /* fall back to in-memory */
    }
  }
  return memory;
}

async function save(list) {
  const rest = restEndpoint();
  if (rest) {
    try {
      await fetch(`${rest.url}/set/${KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rest.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(list),
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

function debugEndpoint() {
  return restEndpoint();
}

module.exports = { load, add, clear, cleanName, LIMIT, debugEndpoint };
