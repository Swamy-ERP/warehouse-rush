const Timer = (() => {
  const DURATION_MS = 60000;
  const BACKSTOP_MS = 120;
  let startAt = 0;
  let running = false;
  let rafId = 0;
  let backstopId = 0;
  let onTick = () => {};
  let onWarn = () => {};
  let onEnd = () => {};
  let warned10 = false;
  let warned5 = false;

  function remainingMs() {
    if (!running) {
      return DURATION_MS;
    }
    return Math.max(0, DURATION_MS - (Date.now() - startAt));
  }

  function remainingSeconds() {
    return Math.ceil(remainingMs() / 1000);
  }

  /* One clock tick. Time is derived from Date.now, so this is safe to call
     from multiple drivers (rAF + backstop interval) — repeats are no-ops. */
  function tick() {
    if (!running) {
      return;
    }
    const ms = remainingMs();
    const sec = Math.ceil(ms / 1000);
    onTick(sec, ms);
    if (sec <= 10 && sec > 0 && !warned10) {
      warned10 = true;
      onWarn(10);
    }
    if (sec <= 5 && sec > 0 && !warned5) {
      warned5 = true;
      onWarn(5);
    }
    if (ms <= 0) {
      running = false;
      onTick(0, 0);
      onEnd();
      return;
    }
  }

  function loop() {
    tick();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    stop();
    startAt = Date.now();
    running = true;
    warned10 = false;
    warned5 = false;
    onTick(60, DURATION_MS);
    rafId = requestAnimationFrame(loop);
    // Backstop: browsers throttle rAF in background tabs (and some preview
    // environments never fire it). A low-rate interval keeps the countdown
    // accurate no matter what, so the 60s rule always holds.
    backstopId = window.setInterval(tick, BACKSTOP_MS);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (backstopId) {
      window.clearInterval(backstopId);
      backstopId = 0;
    }
  }

  function reset() {
    stop();
    warned10 = false;
    warned5 = false;
    onTick(60, DURATION_MS);
  }

  function isRunning() {
    return running;
  }

  return {
    DURATION_MS,
    start,
    stop,
    reset,
    remainingMs,
    remainingSeconds,
    isRunning,
    setHooks(hooks) {
      onTick = hooks.onTick || onTick;
      onWarn = hooks.onWarn || onWarn;
      onEnd = hooks.onEnd || onEnd;
    },
  };
})();
