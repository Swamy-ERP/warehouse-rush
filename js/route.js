const Route = (() => {
  let size = 4;
  let cells = [];
  let path = [];
  let nextDock = 1;
  let onComplete = () => {};
  let active = false;
  let hintCell = null;
  let rejectCell = null;

  function key(r, c) {
    return `${r},${c}`;
  }

  function inBounds(r, c) {
    return r >= 0 && c >= 0 && r < size && c < size;
  }

  function neighbors(r, c) {
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].filter(([nr, nc]) => inBounds(nr, nc));
  }

  function serpentine() {
    const walk = [];
    for (let r = 0; r < size; r += 1) {
      if (r % 2 === 0) {
        for (let c = 0; c < size; c += 1) {
          walk.push({ r, c });
        }
      } else {
        for (let c = size - 1; c >= 0; c -= 1) {
          walk.push({ r, c });
        }
      }
    }
    return walk;
  }

  function hamiltonian(blocked) {
    const blockedSet = new Set(blocked.map((cell) => key(cell.r, cell.c)));
    const total = size * size - blockedSet.size;
    let visits = 0;
    function search(walk, visited) {
      visits += 1;
      if (visits > 250000) {
        return null;
      }
      if (walk.length === total) {
        return walk;
      }
      const curr = walk[walk.length - 1];
      const options = Items.shuffle(neighbors(curr.r, curr.c));
      for (let i = 0; i < options.length; i += 1) {
        const [nr, nc] = options[i];
        const k = key(nr, nc);
        if (blockedSet.has(k) || visited.has(k)) {
          continue;
        }
        visited.add(k);
        const found = search(walk.concat({ r: nr, c: nc }), visited);
        if (found) {
          return found;
        }
        visited.delete(k);
      }
      return null;
    }
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);
      const k0 = key(startR, startC);
      if (blockedSet.has(k0)) {
        continue;
      }
      const visited = new Set([k0]);
      const found = search([{ r: startR, c: startC }], visited);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function pickBlocked(count) {
    const all = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        all.push({ r, c });
      }
    }
    const picked = [];
    while (picked.length < count && all.length) {
      const index = Math.floor(Math.random() * all.length);
      picked.push(all.splice(index, 1)[0]);
    }
    return picked;
  }

  function generate(config) {
    const cfg = config || {};
    size = cfg.size || 4;
    const blockedCount = Math.max(0, Math.min(cfg.blockedCount || 0, size * size - 5));
    let blocked = pickBlocked(blockedCount);
    let walk = hamiltonian(blocked);
    for (let attempt = 0; !walk && attempt < 20; attempt += 1) {
      blocked = pickBlocked(blockedCount);
      walk = hamiltonian(blocked);
    }
    if (!walk) {
      // Extremely unlikely fallback: no shelves, guaranteed serpentine path.
      blocked = [];
      walk = serpentine();
    }
    const last = walk.length - 1;
    const dockAt = {
      1: walk[0],
      2: walk[Math.floor(last / 3)],
      3: walk[Math.floor((2 * last) / 3)],
      4: walk[last],
    };
    const blockedSet = new Set(blocked.map((cell) => key(cell.r, cell.c)));
    cells = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        let kind = "floor";
        let dock = 0;
        if (blockedSet.has(key(r, c))) {
          kind = "blocked";
        } else {
          Object.keys(dockAt).forEach((num) => {
            const d = dockAt[num];
            if (d.r === r && d.c === c) {
              kind = "dock";
              dock = Number(num);
            }
          });
        }
        cells.push({ r, c, kind, dock });
      }
    }
    // Power-up tiles on open floor cells (never docks or shelves). These are
    // cosmetic boosts — they change no scoring and no difficulty rules.
    const powerCount = Math.max(0, Number(cfg.powerCount) || 0);
    Items.shuffle(cells.filter((cell) => cell.kind === "floor"))
      .slice(0, powerCount)
      .forEach((cell) => {
        cell.power = Math.random() < 0.5 ? "express" : "reveal";
      });
    path = [dockAt[1]];
    nextDock = 2;
    return { size, cells, blocked: blocked.length };
  }

  function cellAt(r, c) {
    return cells.find((cell) => cell.r === r && cell.c === c);
  }

  function pathHas(r, c) {
    return path.some((cell) => cell.r === r && cell.c === c);
  }

  function pathIndex(r, c) {
    return path.findIndex((cell) => cell.r === r && cell.c === c);
  }

  function head() {
    return path[path.length - 1];
  }

  function isAdjacent(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function filledExceptDock4() {
    return cells.every(
      (cell) => cell.kind === "blocked" || (cell.kind === "dock" && cell.dock === 4) || pathHas(cell.r, cell.c)
    );
  }

  function isFilled() {
    return cells.every((cell) => cell.kind === "blocked" || pathHas(cell.r, cell.c));
  }

  function canEnter(cell) {
    if (!cell) {
      return false;
    }
    if (cell.kind === "blocked") {
      return false;
    }
    if (pathHas(cell.r, cell.c)) {
      return false;
    }
    if (!isAdjacent(head(), cell)) {
      return false;
    }
    if (cell.kind === "dock") {
      if (cell.dock !== nextDock) {
        return false;
      }
      if (cell.dock === 4 && !filledExceptDock4()) {
        return false;
      }
    }
    return true;
  }

  function syncNextDock() {
    const visitedDocks = path
      .map((p) => cellAt(p.r, p.c))
      .filter((cell) => cell.kind === "dock")
      .map((cell) => cell.dock);
    nextDock = Math.min(4, Math.max(...visitedDocks) + 1);
  }

  function extend(r, c) {
    if (!active) {
      return false;
    }
    hintCell = null;
    const idx = pathIndex(r, c);
    if (idx >= 0) {
      path = path.slice(0, idx + 1);
      syncNextDock();
      if (typeof AudioFx !== "undefined") {
        AudioFx.tile();
      }
      return true;
    }
    const target = cellAt(r, c);
    if (!canEnter(target)) {
      // Out-of-order dock (or Dock 4 too early): refuse the fill, keep the
      // route drawn so far, and flash the locked dock so the player knows why.
      if (target && target.kind === "dock") {
        rejectCell = { r, c };
        if (typeof AudioFx !== "undefined") {
          AudioFx.reject();
        }
        window.setTimeout(() => {
          rejectCell = null;
        }, 500);
      }
      return false;
    }
    const prev = head();
    path.push({ r, c });
    let boosted = false;
    let boostedCell = null;
    if (target.kind === "floor" && target.power === "express") {
      const nr = r + (r - prev.r);
      const nc = c + (c - prev.c);
      const nextCell = cellAt(nr, nc);
      if (nextCell && nextCell.kind === "floor" && nextCell.power !== "express" && !pathHas(nr, nc)) {
        path.push({ r: nr, c: nc });
        boosted = true;
        boostedCell = nextCell;
        if (typeof AudioFx !== "undefined") {
          AudioFx.boost();
        }
      }
    }
    if (target.power === "reveal" || (boostedCell && boostedCell.power === "reveal")) {
      hintCell = hintFrom(head());
      if (typeof AudioFx !== "undefined") {
        AudioFx.reveal();
      }
    }
    if (target.kind === "dock" && target.dock === nextDock) {
      nextDock += 1;
      if (target.dock === 4 && isFilled()) {
        active = false;
        onComplete();
      }
    }
    if (!boosted && typeof AudioFx !== "undefined") {
      AudioFx.tile();
    }
    return true;
  }

  /* Bounded search for a completion from the player's current path. Used by
     reveal tiles: the first move of a found solution is the hinted tile. */
  function hintFrom() {
    const total = cells.filter((cell) => cell.kind !== "blocked").length;
    if (path.length >= total) {
      return null;
    }
    const seed = path.slice();
    let visits = 0;
    function search(walk) {
      visits += 1;
      if (visits > 60000) {
        return null;
      }
      if (walk.length === total) {
        return walk;
      }
      const curr = walk[walk.length - 1];
      const options = Items.shuffle(neighbors(curr.r, curr.c));
      for (let i = 0; i < options.length; i += 1) {
        const [nr, nc] = options[i];
        const target = cellAt(nr, nc);
        if (!target || target.kind === "blocked" || walk.some((w) => w.r === nr && w.c === nc)) {
          continue;
        }
        if (target.kind === "dock") {
          const visitedDocks = walk
            .map((w) => cellAt(w.r, w.c))
            .filter((cell) => cell.kind === "dock")
            .map((cell) => cell.dock);
          const nextNeeded = Math.min(4, Math.max(0, ...visitedDocks) + 1);
          if (target.dock !== nextNeeded) {
            continue;
          }
          if (target.dock === 4 && walk.length + 1 < total) {
            continue;
          }
        }
        const found = search(walk.concat({ r: nr, c: nc }));
        if (found) {
          return found;
        }
      }
      return null;
    }
    const solution = search(seed);
    return solution ? solution[seed.length] : null;
  }

  function undo() {
    if (!active || path.length <= 1) {
      return false;
    }
    path.pop();
    syncNextDock();
    return true;
  }

  function move(dr, dc) {
    const curr = head();
    return extend(curr.r + dr, curr.c + dc);
  }

  function filledCount() {
    return path.length;
  }

  function getTotalCells() {
    return cells.filter((cell) => cell.kind !== "blocked").length;
  }

  let renderedLen = 0;
  let rootNode = null;
  let cellButtons = {};
  let gridBuilt = false;

  /* ---- Drag-to-draw (touch + mouse): press and drag a continuous line ---- */
  let dragActive = false;
  let dragMoved = false;
  let suppressClick = false;

  function cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest ? el.closest(".floor-cell") : null;
    if (!btn || btn.dataset.r === undefined) {
      return null;
    }
    return { r: Number(btn.dataset.r), c: Number(btn.dataset.c) };
  }

  /* Drag toward the cell under the pointer. Straight-line targets (same row
     or column) fill intermediate tiles one step at a time so fast swipes
     don't leave gaps; dragging back over the path truncates like a click. */
  function dragToward(cell) {
    const idx = pathIndex(cell.r, cell.c);
    if (idx >= 0) {
      return extend(cell.r, cell.c);
    }
    const h = head();
    const dr = cell.r - h.r;
    const dc = cell.c - h.c;
    if (dr !== 0 && dc !== 0) {
      return extend(cell.r, cell.c);
    }
    return extend(h.r + Math.sign(dr), h.c + Math.sign(dc));
  }

  function gridPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    dragActive = true;
    dragMoved = false;
  }

  function gridPointerMove(e) {
    if (!dragActive) {
      return;
    }
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) {
      return;
    }
    if (dragToward(cell)) {
      dragMoved = true;
      render(rootNode);
      rootNode.dispatchEvent(new CustomEvent("routechange"));
    }
  }

  function gridPointerUp() {
    dragActive = false;
    if (dragMoved) {
      // A drag moved the path, so swallow the click that follows so the last
      // cell isn't truncated back to itself.
      suppressClick = true;
      dragMoved = false;
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
  }

  /* Build the board once; later renders only toggle classes in place so the
     grid never visibly rebuilds between moves (the 60s clock keeps running). */
  function buildGrid(root) {
    root.className = `route-grid size-${size}`;
    root.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    root.innerHTML = cells
      .map((cell) => {
        if (cell.kind === "blocked") {
          return `<div class="floor-cell is-blocked" role="img" aria-label="Blocked shelf">${Sprite.shelf()}</div>`;
        }
        const classes = ["floor-cell"];
        if (cell.kind === "dock") {
          classes.push("is-dock");
        }
        if (cell.power === "express") {
          classes.push("is-express");
        }
        if (cell.power === "reveal") {
          classes.push("is-reveal");
        }
        const label = cell.kind === "dock" ? String(cell.dock) : "";
        const aria = cell.kind === "dock" ? `Dock ${cell.dock}` : "Open floor";
        let inner = label;
        if (cell.power === "express") {
          inner += `<span class="power power-express" aria-hidden="true">${Sprite.express()}</span>`;
        } else if (cell.power === "reveal") {
          inner += `<span class="power power-reveal" aria-hidden="true">${Sprite.reveal()}</span>`;
        }
        return `<button type="button" class="${classes.join(" ")}" data-r="${cell.r}" data-c="${cell.c}" aria-label="${aria}">${inner}</button>`;
      })
      .join("");
    cellButtons = {};
    root.querySelectorAll(".floor-cell").forEach((btn) => {
      cellButtons[key(Number(btn.dataset.r), Number(btn.dataset.c))] = btn;
      btn.addEventListener("click", () => {
        extend(Number(btn.dataset.r), Number(btn.dataset.c));
        render(root);
        root.dispatchEvent(new CustomEvent("routechange"));
      });
    });
    root.addEventListener("pointerdown", gridPointerDown);
    root.addEventListener("pointermove", gridPointerMove);
    root.addEventListener("pointerup", gridPointerUp);
    root.addEventListener("pointercancel", gridPointerUp);
    root.addEventListener(
      "click",
      (e) => {
        if (suppressClick) {
          e.stopPropagation();
          e.preventDefault();
          suppressClick = false;
        }
      },
      true
    );
    const hasExpress = cells.some((cell) => cell.power === "express");
    const hasReveal = cells.some((cell) => cell.power === "reveal");
    const legendExpress = document.getElementById("legend-express");
    const legendReveal = document.getElementById("legend-reveal");
    if (legendExpress) {
      legendExpress.hidden = !hasExpress;
    }
    if (legendReveal) {
      legendReveal.hidden = !hasReveal;
    }
    gridBuilt = true;
  }

  function render(root) {
    if (root !== rootNode) {
      rootNode = root;
      gridBuilt = false;
    }
    if (!gridBuilt) {
      buildGrid(root);
    }
    const newIdx = path.length > renderedLen ? path.length - 1 : -1;
    const removedIdx = path.length < renderedLen ? path.length : -1;
    renderedLen = path.length;
    const headCell = head();
    cells.forEach((cell) => {
      const btn = cellButtons[key(cell.r, cell.c)];
      if (!btn) {
        return;
      }
      const onPath = pathHas(cell.r, cell.c);
      const pathI = pathIndex(cell.r, cell.c);
      const isHead = onPath && headCell && cell.r === headCell.r && cell.c === headCell.c;
      const isHint = hintCell && cell.r === hintCell.r && cell.c === hintCell.c;
      btn.classList.toggle("is-path", onPath);
      btn.classList.toggle("is-head", isHead);
      btn.classList.toggle("is-done", !active && cell.kind === "dock" && cell.dock === 4);
      btn.classList.toggle("is-hint", isHint);
      btn.classList.toggle("is-reject", rejectCell && cell.r === rejectCell.r && cell.c === rejectCell.c);
      if (pathI === newIdx) {
        btn.classList.remove("is-new");
        void btn.offsetWidth;
        btn.classList.add("is-new");
      } else {
        btn.classList.remove("is-new");
      }
      if (pathI === removedIdx) {
        btn.classList.remove("is-removed");
        void btn.offsetWidth;
        btn.classList.add("is-removed");
        window.setTimeout(() => btn.classList.remove("is-removed"), 320);
      } else {
        btn.classList.remove("is-removed");
      }
      const hasForklift = !!btn.querySelector(".forklift");
      if (isHead && !hasForklift) {
        const span = document.createElement("span");
        span.className = "forklift";
        span.setAttribute("aria-hidden", "true");
        span.innerHTML = Sprite.forklift();
        btn.appendChild(span);
      } else if (!isHead && hasForklift) {
        btn.querySelector(".forklift").remove();
      }
    });
  }

  function start(hooks, config) {
    generate(config);
    active = true;
    onComplete = hooks.onComplete || (() => {});
    return { size, nextDock };
  }

  function getNextDock() {
    return Math.min(nextDock, 4);
  }

  function isActive() {
    return active;
  }

  function deactivate() {
    active = false;
  }

  function reset() {
    cells = [];
    path = [];
    nextDock = 1;
    active = false;
    renderedLen = 0;
    hintCell = null;
    rejectCell = null;
    rootNode = null;
    cellButtons = {};
    gridBuilt = false;
  }

  return {
    start,
    render,
    undo,
    move,
    getNextDock,
    filledCount,
    getTotalCells,
    isFilled,
    isActive,
    deactivate,
    reset,
  };
})();
