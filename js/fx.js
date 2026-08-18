/* Presentation effects — pure DOM/CSS, no dependencies, no network. */
const Fx = (() => {
  const COLORS = ["#ffb020", "#ff8a3d", "#5b6cff", "#3ecf8e", "#ffd37a", "#ff5d5d"];

  function layer() {
    return document.getElementById("fx-layer");
  }

  /* ---- Confetti burst into the fixed fx layer ---- */
  function confetti(count, origin) {
    const host = layer();
    if (!host) {
      return;
    }
    const n = count || 30;
    for (let i = 0; i < n; i += 1) {
      const piece = document.createElement("i");
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 5 + Math.random() * 7;
      const dur = 1.4 + Math.random() * 1.6;
      const delay = Math.random() * 0.5;
      const drift = (Math.random() * 2 - 1) * 40;
      piece.className = "confetti";
      piece.style.cssText = `--c:${color};--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;--drift:${drift.toFixed(0)}px;width:${size.toFixed(1)}px;height:${(size * 1.4).toFixed(1)}px;left:${(origin ? origin.x : 20 + Math.random() * 60) + "%"};`;
      piece.setAttribute("aria-hidden", "true");
      host.appendChild(piece);
      window.setTimeout(() => piece.remove(), (dur + delay) * 1000 + 200);
    }
  }

  /* ---- Floating "+10" popup anchored to an element ---- */
  function popup(text, anchor) {
    const host = layer();
    const target = anchor || document.body;
    if (!host) {
      return;
    }
    const el = document.createElement("span");
    el.className = "fx-popup";
    el.textContent = text;
    const rect = target.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
  }

  /* ---- Screen shake for wrong picks ---- */
  function shake(target) {
    const el = target || document.getElementById("screen-play");
    if (!el) {
      return;
    }
    el.classList.remove("fx-shake");
    void el.offsetWidth;
    el.classList.add("fx-shake");
    window.setTimeout(() => el.classList.remove("fx-shake"), 500);
  }

  /* ---- Round / shift banner ---- */
  function banner(title, sub, kind) {
    const host = layer();
    if (!host) {
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = `fx-banner ${kind ? `banner-${kind}` : ""}`;
    wrap.innerHTML = `<div class="fx-banner-inner">
      <span class="banner-kicker">Shift incoming</span>
      <strong class="banner-title">${title}</strong>
      ${sub ? `<span class="banner-sub">${sub}</span>` : ""}
    </div>`;
    host.appendChild(wrap);
    window.setTimeout(() => {
      wrap.classList.add("leaving");
      window.setTimeout(() => wrap.remove(), 380);
    }, 950);
  }

  /* ---- Results score count-up ---- */
  function countUp(el, to, dur) {
    if (!el) {
      return;
    }
    const duration = dur || 1100;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(to * eased));
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = String(to);
      }
    }
    requestAnimationFrame(frame);
  }

  return { confetti, popup, shake, banner, countUp };
})();
