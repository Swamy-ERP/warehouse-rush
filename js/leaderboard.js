const Leaderboard = (() => {
  const KEY = "warehouse-rush-leaderboard";
  const LIMIT = 10;
  // Shared leaderboard endpoint. Override with window.WAREHOUSE_RUSH_API, or
  // set the query param ?api=... before the game loads. Default: same origin
  // when served by a server, otherwise the bundled leaderboard server.
  const API_BASE =
    (window.WAREHOUSE_RUSH_API && String(window.WAREHOUSE_RUSH_API)) ||
    (window.location && window.location.protocol.indexOf("http") === 0
      ? window.location.origin
      : "http://127.0.0.1:8000");

  // Shared scores are OPT-IN so the game makes zero network requests by
  // default (compliance §5.4 / §9.2: no unauthorized transmission). Enable
  // with ?shared=1 in the URL or window.WAREHOUSE_RUSH_SHARED_LB = true
  // before the game loads. Local Top-10 always works regardless.
  const SHARED_ENABLED =
    (typeof window !== "undefined" && window.WAREHOUSE_RUSH_SHARED_LB === true) ||
    (typeof window !== "undefined" &&
      window.location &&
      /[?&]shared=1(?:&|$)/.test(window.location.search));

  let sharedOnline = false;

  /* ---------- Local storage Top 10 (offline fallback) ---------- */

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (err) {
      /* ignore quota / private-mode errors */
    }
  }

  function addEntry(entry) {
    const list = read();
    list.push({
      name: entry.name,
      score: entry.score,
      rounds: entry.rounds,
      at: new Date().toISOString(),
    });
    list.sort((a, b) => b.score - a.score || new Date(b.at) - new Date(a.at));
    const next = list.slice(0, LIMIT);
    write(next);
    return next;
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      /* ignore quota / private-mode errors */
    }
    return [];
  }

  /* ---------- Shared leaderboard API ---------- */

  function isSharedEnabled() {
    return SHARED_ENABLED;
  }

  async function fetchShared() {
    if (!SHARED_ENABLED) {
      sharedOnline = false;
      return null;
    }
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = await res.json();
      if (!Array.isArray(data.entries)) {
        throw new Error("unexpected payload");
      }
      sharedOnline = true;
      return data.entries;
    } catch (err) {
      sharedOnline = false;
      return null;
    }
  }

  async function submitScore(entry) {
    if (!SHARED_ENABLED) {
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name,
          score: entry.score,
          rounds: entry.rounds,
        }),
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      sharedOnline = true;
      return true;
    } catch (err) {
      sharedOnline = false;
      return false;
    }
  }

  function isSharedOnline() {
    return sharedOnline;
  }

  function apiBase() {
    return API_BASE;
  }

  return { read, addEntry, clear, LIMIT, fetchShared, submitScore, isSharedOnline, isSharedEnabled, apiBase };
})();
