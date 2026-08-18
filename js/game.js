const Game = (() => {
  const LOAD_MS = 900;
  const FAIL_MS = 700;

  const DIFF = {
    label: "Shift complete",
    short: "Shift",
    flashMs: 2000,
    points: 10,
    route: () => ({ size: 4, blockedCount: 1 + Math.floor(Math.random() * 2), powerCount: 1 }),
  };

  /* Streak scoring: every completed shift pays 10 base points. A perfect
     shift (no wrong memory picks) grows the streak and pays an extra
     (streak − 1) × 10 — streak ×2 pays 20, ×3 pays 30, and so on. A wrong
     pick resets the streak to 0, so the next round counts from 1 again
     (just the 10, no bonus). */
  function shiftPoints(perfect, streakCount) {
    return perfect ? 10 + (streakCount - 1) * 10 : 10;
  }

  const els = {};
  let round = 0;
  let phase = "idle";
  let currentDiff = DIFF;
  let timeouts = [];
  let roundsCleared = 0;
  let ended = false;
  let streak = 0;
  let streakPerfect = true;

  function $(id) {
    return document.getElementById(id);
  }

  function secondsText(ms) {
    const s = ms / 1000;
    return Number.isInteger(s) ? `${s} second${s === 1 ? "" : "s"}` : `${s} seconds`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function queue(fn, ms) {
    const id = setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  }

  function clearTimers() {
    timeouts.forEach((id) => clearTimeout(id));
    timeouts = [];
  }

  function showScreen(id) {
    ["screen-welcome", "screen-instructions", "screen-play", "screen-results"].forEach((screenId) => {
      const node = $(screenId);
      const active = screenId === id;
      node.hidden = !active;
    });
  }

  function setHud() {
    els.hudName.textContent = Player.getName() || "—";
    els.hudScore.textContent = String(Score.get());
    els.hudRound.textContent = round ? String(round) : "—";
  }

  function setTimeDisplay(sec) {
    els.hudTime.textContent = String(sec);
    document.body.classList.toggle("timer-warn", sec <= 10 && sec > 5);
    document.body.classList.toggle("timer-urgent", sec <= 5);
    if (sec <= 5) {
      els.hudTimeLabel.textContent = "Time · Hurry";
    } else if (sec <= 10) {
      els.hudTimeLabel.textContent = "Time · Warning";
    } else {
      els.hudTimeLabel.textContent = "Time";
    }
    if (typeof AudioFx !== "undefined") {
      AudioFx.setIntensity(sec <= 5 ? 2 : sec <= 10 ? 1 : 0);
    }
  }

  function setPrompt(title, hint) {
    els.phasePrompt.textContent = title;
    els.phaseHint.textContent = hint;
    els.playScreen.classList.remove("feedback-ok", "feedback-bad");
    els.liveFeedback.textContent = `${title}. ${hint}`;
  }

  function hideStages() {
    els.memoryStage.hidden = true;
    els.truckStage.hidden = true;
    els.routeStage.hidden = true;
  }

  function canAct() {
    return !ended && !Score.isFrozen() && Timer.isRunning();
  }

  function beginRound() {
    if (!canAct()) {
      return;
    }
    round += 1;
    currentDiff = DIFF;
    Memory.reset();
    Route.reset();
    Memory.start({ onResolved: onMemoryResolved });
    streakPerfect = true;
    setShiftPill();
    setHud();
    if (round > 1 && typeof Fx !== "undefined") {
      Fx.banner(`Shift ${round}`, streak >= 1 ? `Streak ×${streak + 1} · up to +${10 * (streak + 1)}` : "+10 pts per shift");
    }
    flashCurrent();
  }

  function flashCurrent() {
    if (!canAct()) {
      return;
    }
    phase = "flash";
    hideStages();
    els.memoryStage.hidden = false;
    els.truckBed.innerHTML = "";
    Memory.renderFlash(els.memoryStage);
    setPrompt(`Memorize the shipment · ${currentDiff.short}`, `Two items for ${secondsText(currentDiff.flashMs)}. Then pick both from four cards.`);
    queue(showChoices, currentDiff.flashMs);
  }

  function showChoices() {
    if (!canAct() || phase !== "flash") {
      return;
    }
    phase = "pick";
    hideStages();
    els.memoryStage.hidden = false;
    Memory.renderChoices(els.memoryStage);
    setPrompt("Choose 2 of 4", "Select both items that were in the flash.");
  }

  function onMemoryResolved(result) {
    if (!canAct() || phase !== "pick") {
      return;
    }
    if (result.ok) {
      AudioFx.correct();
      showTruckLoad(result.selected);
      return;
    }
    AudioFx.wrong();
    streakPerfect = false;
    if (typeof Fx !== "undefined") {
      Fx.shake(els.playScreen);
    }
    phase = "retry";
    els.playScreen.classList.add("feedback-bad");
    setPrompt("Try again", "Wrong pair. The same two items will flash again.");
    queue(() => {
      if (!canAct()) {
        return;
      }
      Memory.retry();
      flashCurrent();
    }, FAIL_MS);
  }

  function showTruckLoad(selectedIds) {
    phase = "load";
    hideStages();
    els.truckStage.hidden = false;
    els.truckPhoto.classList.remove("is-arriving");
    void els.truckPhoto.offsetWidth;
    els.truckPhoto.classList.add("is-arriving");
    els.truckBed.innerHTML = selectedIds
      .map((id, index) => {
        const item = Items.byId(id);
        return `<figure style="--i:${index}">${Items.photo(item)}<figcaption>${item.name}</figcaption></figure>`;
      })
      .join("");
    els.truckStatus.textContent = "Shipment loaded. Plot the dock route.";
    els.playScreen.classList.add("feedback-ok");
    setPrompt("Shipment loaded", "The truck is rolling. Plot a route from Dock 1 to Dock 4.");
    AudioFx.rumble();
    AudioFx.horn();
    if (typeof Fx !== "undefined") {
      Fx.confetti(10);
    }
    queue(showRoute, LOAD_MS);
  }

  function showRoute() {
    if (!canAct() || phase !== "load") {
      return;
    }
    phase = "route";
    hideStages();
    els.routeStage.hidden = false;
    Route.start({ onComplete: onRouteComplete }, currentDiff.route());
    Route.render(els.routeGrid);
    updateRouteTarget();
    setPrompt(`Plot the forklift route · ${currentDiff.short}`, "Visit docks 1, 2, 3, then 4. Cover every open tile and dodge the shelves. Undo if you get stuck.");
  }

  function updateRouteTarget() {
    const next = Route.getNextDock();
    const done = !Route.isActive();
    const filled = Route.filledCount();
    const total = Route.getTotalCells();
    els.routeTarget.textContent = done
      ? `Route complete · ${total} / ${total}`
      : `Fill every tile · ${filled} / ${total} · next dock ${next}`;
  }

  function onRouteComplete() {
    if (!canAct() || phase !== "route") {
      return;
    }
    phase = "award";
    const perfect = streakPerfect;
    streak = perfect ? streak + 1 : 0;
    const pts = shiftPoints(perfect, streak);
    const bonus = perfect ? (streak - 1) * 10 : 0;
    Score.add(pts);
    roundsCleared += 1;
    setHud();
    setStreakHud(true);
    els.hudScore.classList.remove("score-pop");
    void els.hudScore.offsetWidth;
    els.hudScore.classList.add("score-pop");
    AudioFx.complete();
    els.playScreen.classList.add("feedback-ok");
    Route.render(els.routeGrid);
    updateRouteTarget();
    setPrompt(`${perfect ? "Perfect shift" : "Shift"} complete · +${pts}`, bonus > 0 ? `Streak ×${streak} — keep it going!` : "Next shipment incoming.");
    if (typeof Fx !== "undefined") {
      Fx.confetti(26);
      Fx.popup(`+${pts}`, els.hudScore);
      if (perfect && bonus > 0) {
        Fx.popup(`Streak ×${streak}`, els.streakWrap);
      }
    }
    queue(beginRound, 450);
  }

  function endGame() {
    if (ended) {
      return;
    }
    ended = true;
    phase = "results";
    clearTimers();
    Timer.stop();
    Route.deactivate();
    Memory.reset();
    const finalScore = Score.freeze();
    const best = Score.savePersonalBest();
    if (finalScore > 0) {
      const entry = {
        name: Player.getName(),
        score: finalScore,
        rounds: roundsCleared,
      };
      Leaderboard.addEntry(entry);
      Leaderboard.submitScore(entry);
    }
    AudioFx.timeup();
    setTimeDisplay(0);
    setHud();
    const isNewBest = finalScore > 0 && finalScore === best;
    els.resultsGreeting.textContent = `Well played, ${Player.getName()}.${isNewBest ? " New personal best!" : ""}`;
    setResultsTier(finalScore);
    els.resultsScore.textContent = String(finalScore);
    els.resultsBest.textContent = String(best);
    els.resultsStatus.textContent = "Time hit zero — the loading bay closed.";
    els.resultsRounds.textContent = `Rounds completed: ${roundsCleared}`;
    renderLeaderboard();
    showScreen("screen-results");
    if (typeof Fx !== "undefined") {
      Fx.countUp(els.resultsScore, finalScore);
      if (finalScore > 0) {
        Fx.confetti(46);
      }
    }
  }

  function resetSession() {
    clearTimers();
    ended = false;
    round = 0;
    phase = "idle";
    currentDiff = DIFF;
    roundsCleared = 0;
    Score.reset();
    Memory.reset();
    Route.reset();
    Timer.reset();
    streak = 0;
    streakPerfect = true;
    document.body.classList.remove("timer-warn", "timer-urgent");
    setTimeDisplay(60);
    setHud();
    setStreakHud(false);
    hideStages();
  }

  function setStreakHud(pop) {
    if (!els.streakWrap) {
      return;
    }
    els.streakWrap.hidden = streak < 2;
    els.streakCount.textContent = String(streak);
    if (pop && streak >= 2) {
      els.streakWrap.classList.remove("score-pop");
      void els.streakWrap.offsetWidth;
      els.streakWrap.classList.add("score-pop");
    }
  }

  function setShiftPill() {
    if (!els.shiftPill) {
      return;
    }
    els.shiftPill.textContent =
      streak >= 1 ? `Shift +10 pts · streak ×${streak + 1} → +${10 * (streak + 1)}` : "Shift +10 pts";
    els.shiftPill.className = "shift-pill";
  }

  function setResultsTier(score) {
    if (!els.resultsTier) {
      return;
    }
    let label = "Rookie Loader";
    let cls = "tier-rookie";
    if (score >= 100) {
      label = "Shipping Magnate";
      cls = "tier-legend";
    } else if (score >= 60) {
      label = "Warehouse Pro";
      cls = "tier-pro";
    } else if (score >= 30) {
      label = "Dock Foreman";
      cls = "tier-foreman";
    } else if (score >= 10) {
      label = "Forklift Driver";
      cls = "tier-driver";
    }
    els.resultsTier.textContent = label;
    els.resultsTier.className = `results-tier ${cls}`;
  }

  async function renderLeaderboard() {
    const shared = await Leaderboard.fetchShared();
    if (shared) {
      els.lbMode.textContent = "Shared across all players on this server · live";
      els.lbMode.className = "lb-mode lb-online";
      els.btnClearLeaderboard.hidden = true;
      renderLeaderboardList(shared);
      return;
    }
    if (!Leaderboard.isSharedEnabled()) {
      els.lbMode.textContent =
        "Shared leaderboard not enabled — showing this device’s Top 10. To share scores, run the bundled server and open the game with ?shared=1 (see README).";
    } else {
      els.lbMode.textContent =
        "Leaderboard server offline — showing this device only. Run: python3 server/leaderboard_server.py";
    }
    els.lbMode.className = "lb-mode lb-offline";
    els.btnClearLeaderboard.hidden = false;
    renderLeaderboardList(Leaderboard.read());
  }

  function renderLeaderboardList(list) {
    if (!list.length) {
      els.leaderboardList.innerHTML = '<li class="leaderboard-empty">No scores yet. Be the first!</li>';
      return;
    }
    els.leaderboardList.innerHTML = list
      .map((entry, index) => {
        const when = new Date(entry.at).toLocaleDateString();
        const roundsLabel = entry.rounds === 1 ? "1 round" : `${entry.rounds} rounds`;
        return `<li><span class="lb-rank">${index + 1}</span><span class="lb-name">${escapeHtml(entry.name)}</span><span class="lb-score">${entry.score} pts · ${roundsLabel}</span><span class="lb-date">${when}</span></li>`;
      })
      .join("");
  }

  function startGame() {
    AudioFx.unlock();
    AudioFx.startMusic();
    resetSession();
    showScreen("screen-play");
    setHud();
    Timer.start();
    beginRound();
  }

  function replay() {
    startGame();
  }

  function cacheElements() {
    els.hudName = $("hud-name");
    els.hudScore = $("hud-score");
    els.hudTime = $("hud-time");
    els.hudRound = $("hud-round");
    els.btnInstructions = $("btn-instructions");
    els.btnMute = $("btn-mute");
    els.nameForm = $("name-form");
    els.playerName = $("player-name");
    els.nameError = $("name-error");
    els.btnStart = $("btn-start");
    els.btnBackWelcome = $("btn-back-welcome");
    els.playScreen = $("screen-play");
    els.phasePrompt = $("phase-prompt");
    els.phaseHint = $("phase-hint");
    els.memoryStage = $("memory-stage");
    els.truckStage = $("truck-stage");
    els.truckPhoto = document.querySelector(".truck-photo");
    els.truckBed = $("truck-bed");
    els.truckStatus = $("truck-status");
    els.routeStage = $("route-stage");
    els.routeGrid = $("route-grid");
    els.routeTarget = $("route-target");
    els.btnUndo = $("btn-undo");
    els.liveFeedback = $("live-feedback");
    els.resultsGreeting = $("results-greeting");
    els.resultsScore = $("results-score");
    els.resultsBest = $("results-best");
    els.btnReplay = $("btn-replay");
    els.clockNote = $("clock-running-note");
    els.hudTimeLabel = $("hud-time-label");
    els.shiftPill = $("shift-pill");
    els.resultsStatus = $("results-status");
    els.resultsRounds = $("results-rounds");
    els.resultsTier = $("results-tier");
    els.streakWrap = $("hud-streak-wrap");
    els.streakCount = $("hud-streak-count");
    els.leaderboardList = $("leaderboard-list");
    els.lbMode = $("lb-mode");
    els.btnClearLeaderboard = $("btn-clear-leaderboard");
  }

  function showInstructions(fromPlay) {
    const live = fromPlay && Timer.isRunning() && !ended;
    showScreen("screen-instructions");
    els.btnStart.textContent = live ? "Return to shift" : "Start";
    els.btnBackWelcome.hidden = live;
    els.clockNote.hidden = !live;
  }

  function bind() {
    els.nameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const check = Player.validate(els.playerName.value);
      if (!check.ok) {
        els.nameError.hidden = false;
        els.nameError.textContent = check.message;
        els.playerName.focus();
        return;
      }
      els.nameError.hidden = true;
      Player.setName(check.value);
      setHud();
      AudioFx.unlock();
      AudioFx.startMusic();
      showInstructions(false);
    });

    els.btnStart.addEventListener("click", () => {
      if (Timer.isRunning() && !ended) {
        showInstructions(false);
        showScreen("screen-play");
        return;
      }
      startGame();
    });
    els.btnBackWelcome.addEventListener("click", () => {
      if (Timer.isRunning() && !ended) {
        return;
      }
      showScreen("screen-welcome");
    });
    els.btnReplay.addEventListener("click", replay);
    els.btnClearLeaderboard.addEventListener("click", () => {
      Leaderboard.clear();
      renderLeaderboard();
    });
    els.btnInstructions.addEventListener("click", () => {
      if (!Player.getName()) {
        els.nameError.hidden = false;
        els.nameError.textContent = "Enter your name first, then open Instructions.";
        els.playerName.focus();
        return;
      }
      showInstructions(Timer.isRunning() && !ended);
    });
    els.btnMute.addEventListener("click", () => {
      const muted = AudioFx.toggle();
      els.btnMute.textContent = muted ? "Unmute" : "Mute";
      els.btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
    });
    els.btnUndo.addEventListener("click", () => {
      if (phase === "route" && canAct() && Route.undo()) {
        Route.render(els.routeGrid);
        updateRouteTarget();
      }
    });
    els.routeGrid.addEventListener("routechange", () => {
      if (phase === "route" && canAct()) {
        updateRouteTarget();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "m" || event.key === "M") {
        if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
          return;
        }
        els.btnMute.click();
        return;
      }
      if (!canAct() || phase !== "route") {
        return;
      }
      const key = event.key.toLowerCase();
      let moved = false;
      if (key === "arrowup" || key === "w") {
        moved = Route.move(-1, 0);
      } else if (key === "arrowdown" || key === "s") {
        moved = Route.move(1, 0);
      } else if (key === "arrowleft" || key === "a") {
        moved = Route.move(0, -1);
      } else if (key === "arrowright" || key === "d") {
        moved = Route.move(0, 1);
      } else if (key === "backspace" || key === "z") {
        event.preventDefault();
        moved = Route.undo();
      }
      if (moved) {
        event.preventDefault();
        Route.render(els.routeGrid);
        updateRouteTarget();
      }
    });
  }

  function init() {
    cacheElements();
    bind();
    Timer.setHooks({
      onTick(sec) {
        setTimeDisplay(sec);
      },
      onWarn(level) {
        if (level === 10) {
          AudioFx.warn();
          els.liveFeedback.textContent = "10 seconds remaining.";
        }
        if (level === 5) {
          AudioFx.urgent();
          els.liveFeedback.textContent = "5 seconds remaining. Finish the current job.";
        }
      },
      onEnd: endGame,
    });
    setTimeDisplay(60);
    setHud();
    els.playerName.focus();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { startGame, replay, endGame };
})();
