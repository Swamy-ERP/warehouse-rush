const Score = (() => {
  const BEST_KEY = "warehouse-rush-best";
  let value = 0;
  let frozen = false;

  function get() {
    return value;
  }

  function isFrozen() {
    return frozen;
  }

  function add(points) {
    if (frozen) {
      return value;
    }
    value += points;
    return value;
  }

  function freeze() {
    frozen = true;
    return value;
  }

  function reset() {
    value = 0;
    frozen = false;
    return value;
  }

  function getPersonalBest() {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (err) {
      return 0;
    }
  }

  function savePersonalBest() {
    const best = Math.max(getPersonalBest(), value);
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (err) {
      return best;
    }
    return best;
  }

  function clearPersonalBest() {
    try {
      localStorage.removeItem(BEST_KEY);
    } catch (err) {
      /* ignore quota / private-mode errors */
    }
    return 0;
  }

  return { get, add, freeze, reset, isFrozen, getPersonalBest, savePersonalBest, clearPersonalBest };
})();
