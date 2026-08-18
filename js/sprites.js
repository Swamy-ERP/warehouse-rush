/* Shared SVG art — one flat industrial style for the whole game. */
const Sprite = (() => {
  function forklift() {
    return `<svg viewBox="0 0 64 44" aria-hidden="true">
      <ellipse cx="30" cy="41" rx="26" ry="2.6" fill="rgba(0,0,0,0.28)"/>
      <rect x="10" y="25" width="24" height="3.4" rx="1.7" fill="#9aa6ba"/>
      <rect x="10" y="29" width="24" height="3.4" rx="1.7" fill="#9aa6ba"/>
      <rect x="13" y="12" width="4" height="26" rx="2" fill="#6c768e"/>
      <rect x="9" y="18" width="9" height="14" rx="2.5" fill="#e06e24"/>
      <rect x="14" y="16" width="28" height="14" rx="4" fill="#ff8a3d"/>
      <rect x="32" y="19" width="8" height="8" rx="2" fill="#1b2440"/>
      <circle cx="20" cy="33" r="5.2" fill="#141a2e"/>
      <circle cx="20" cy="33" r="2" fill="#8a97b5"/>
      <circle cx="36" cy="33" r="5.2" fill="#141a2e"/>
      <circle cx="36" cy="33" r="2" fill="#8a97b5"/>
      <circle cx="41" cy="24" r="2" fill="#ffd37a"/>
      <path d="M26 16h-4" stroke="#c95f1f" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function shelf() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="9" width="44" height="48" rx="5" fill="#33281f"/>
      <rect x="12" y="11" width="40" height="44" rx="3" fill="#4a3b30"/>
      <rect x="12" y="24" width="40" height="4.5" fill="#57493b"/>
      <rect x="12" y="42" width="40" height="4.5" fill="#57493b"/>
      <rect x="15" y="14" width="15" height="8.5" rx="1.5" fill="#ffd37a"/>
      <rect x="32" y="13.5" width="17" height="9" rx="1.5" fill="#7fb7e8"/>
      <rect x="15" y="31.5" width="18" height="8.5" rx="1.5" fill="#ff9d76"/>
      <rect x="35" y="31" width="14" height="9" rx="1.5" fill="#8fd0a8"/>
      <rect x="17" y="16" width="7" height="5" rx="1" fill="rgba(255,255,255,0.25)"/>
    </svg>`;
  }

  function box() {
    return `<svg viewBox="0 0 40 32" aria-hidden="true">
      <path d="M4 10 20 2l16 8v12L20 30 4 22Z" fill="#e8890c"/>
      <path d="M4 10l16 8 16-8M20 18v12" fill="none" stroke="#b25f05" stroke-width="2.4"/>
      <path d="M8 14v8" stroke="rgba(255,255,255,0.5)" stroke-width="1.6"/>
    </svg>`;
  }

  function express() {
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M18 3 7 18h7l-2 11 11-15h-7z" fill="#ffb020" stroke="#8a5a00" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }

  function reveal() {
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="13" r="8" fill="#ffd37a" stroke="#a35b08" stroke-width="1.5"/>
      <path d="M13 9.5c1.6-1.5 4-.6 4.1 1.4.2 1.2-1 1.6-1.3 2.7" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M13 23h6" stroke="#a35b08" stroke-width="2" stroke-linecap="round"/>
      <rect x="14.2" y="25" width="3.6" height="3" rx="1" fill="#8a97b5"/>
      <path d="M12.5 15c-.8-1.4-.6-3.4.8-4.6M20 15c.8-1.4.6-3.4-.8-4.6" fill="none" stroke="#ffd37a" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  return { forklift, shelf, box, express, reveal };
})();
