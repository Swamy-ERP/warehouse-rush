/* Warehouse Rush — shared leaderboard storage for the Vercel functions.
 *
 * Keeps a Top-10 in memory, and persists when a backend is configured:
 *   - Vercel Redis (recommended): the `redis` npm client uses the REDIS_URL
 *     env var that Vercel adds automatically when the store is connected.
 *   - Upstash-style REST: KV_REST_API_URL/KV_REST_API_TOKEN, or
 *     REDIS_REST_API_URL/REDIS_REST_API_TOKEN, or
 *     UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.
 * Without any of these the board works but resets when the function
 * cold-starts. All remote calls are bounded so a dead backend can never
 * hang the API.
 */
const { createClient } = require("redis");

const LIMIT = 10;
const MAX_NAME = 24;
const KEY = "warehouse_rush_scores";
const REMOTE_TIMEOUT_MS = 3000;

let memory = [];
let redisClient = null;

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
  return null;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "")
    .replace(/[<>"'&]/g, "") // strip HTML-special chars (client also escapes)
    .trim()
    .slice(0, MAX_NAME);
}

/* Reuse a connected client across warm invocations; fail fast (3s) so a
   broken store degrades to memory instead of hanging the function. */
async function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: REMOTE_TIMEOUT_MS, reconnectStrategy: false },
    });
    redisClient.on("error", () => {});
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    redisClient = null;
    return null;
  }
}

async function parseStored(raw) {
  if (!raw) {
    return [];
  }
  let parsed = JSON.parse(raw);
  if (typeof parsed === "string") {
    // Defensive: some stores round-trip the value as a JSON string.
    parsed = JSON.parse(parsed);
  }
  return Array.isArray(parsed) ? parsed : [];
}

async function load() {
  const rest = restEndpoint();
  if (rest) {
    try {
      const res = await fetch(`${rest.url}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${rest.token}` },
        signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      });
      return await parseStored((await res.json()).result);
    } catch (err) {
      /* fall back to in-memory */
    }
  } else {
    try {
      const client = await getRedis();
      if (client) {
        return await parseStored(await client.get(KEY));
      }
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
        signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      });
    } catch (err) {
      /* keep in-memory copy */
    }
  } else {
    try {
      const client = await getRedis();
      if (client) {
        await client.set(KEY, JSON.stringify(list));
      }
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

/* Debug helpers (used by the API only under the x-wr-debug header). */
function debugBackend() {
  if (restEndpoint()) {
    return { mode: "rest", host: restEndpoint().url.replace(/^https?:\/\//, "").split("/")[0] };
  }
  if (process.env.REDIS_URL) {
    return { mode: "redis-client", host: String(process.env.REDIS_URL).replace(/^rediss?:\/\/[^@]*@/, "") };
  }
  return { mode: "memory" };
}

async function redisPing() {
  const client = await getRedis();
  if (!client) {
    return null;
  }
  try {
    return await client.ping();
  } catch (err) {
    return "ERR: " + err.message;
  }
}

module.exports = { load, add, clear, cleanName, LIMIT, debugBackend, redisPing };
