/* Item catalog + flat SVG artwork. Deal logic (2 originals + 2 decoys,
   shown as 4 cards) is intentional — only the artwork moved from photos
   to SVG. */
const Items = (() => {
  const catalog = [
    { id: "apple", name: "Apple", group: "food" },
    { id: "banana", name: "Banana", group: "food" },
    { id: "pizza", name: "Pizza", group: "food" },
    { id: "burger", name: "Burger", group: "food" },
    { id: "soda", name: "Soda", group: "beverage" },
    { id: "coffee", name: "Coffee", group: "beverage" },
    { id: "water", name: "Water bottle", group: "beverage" },
    { id: "phone", name: "Phone", group: "electronics" },
    { id: "headphones", name: "Headphones", group: "electronics" },
    { id: "laptop", name: "Laptop", group: "electronics" },
    { id: "remote", name: "Remote", group: "electronics" },
  ];

  function byId(id) {
    return catalog.find((item) => item.id === id);
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /* ---------- Flat SVG artwork (one style, 64x64) ---------- */

  const ART = {
    apple: `
      <circle cx="32" cy="38" r="15" fill="#e0523f"/>
      <ellipse cx="26.5" cy="31.5" rx="5" ry="8.5" fill="#f8b8ae" opacity="0.75"/>
      <path d="M32 26c1-7 7-9 9-6.5-1.8 1.6-2 3.6-2 6.5" fill="none" stroke="#57a05c" stroke-width="3" stroke-linecap="round"/>
      <line x1="32" y1="26" x2="32" y2="21" stroke="#7a4a2b" stroke-width="3" stroke-linecap="round"/>`,
    banana: `
      <path d="M19 46c-1-16 8-27 28-27" fill="none" stroke="#f6c344" stroke-width="13" stroke-linecap="round"/>
      <circle cx="19" cy="45" r="4" fill="#8a5a3b"/>
      <circle cx="46" cy="20" r="4" fill="#8a5a3b"/>
      <path d="M26 40c4-1 8-3 11-6" fill="none" stroke="#b98a12" stroke-width="2" stroke-linecap="round"/>`,
    pizza: `
      <path d="M32 50 12 28a20 20 0 0 1 40 0Z" fill="#f6c344"/>
      <path d="M12 28a20 20 0 0 1 40 0" fill="none" stroke="#e08a2b" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="33.5" r="9" fill="#d94f4f"/>
      <circle cx="24.5" cy="26" r="3.2" fill="#b42318"/>
      <circle cx="38.5" cy="28" r="3.2" fill="#b42318"/>
      <circle cx="31" cy="40" r="3.2" fill="#b42318"/>`,
    burger: `
      <path d="M17 27c0-8 6.5-13 15-13s15 5 15 13Z" fill="#e8a13c"/>
      <path d="M16 30c1.5-2 3.5 2 5.5 0s4 2 6 0 4 2 6 0 4 2 6 0 3.5 2 5 0 2 2 3.5 0v3H16Z" fill="#6fae5a"/>
      <rect x="16" y="36" width="32" height="6" rx="3" fill="#7a4a2b"/>
      <path d="M16 42h32v5c0 2.8-7.2 5-16 5s-16-2.2-16-5Z" fill="#e8a13c"/>
      <circle cx="40" cy="30" r="1.6" fill="rgba(255,255,255,0.55)"/>`,
    soda: `
      <rect x="21" y="16" width="22" height="34" rx="6" fill="#d94f4f"/>
      <ellipse cx="32" cy="16" rx="11" ry="3.4" fill="#f2b9b2"/>
      <circle cx="32" cy="21.5" r="2" fill="#f5f7fb"/>
      <rect x="21" y="28" width="22" height="6" fill="#f5f7fb"/>
      <rect x="21" y="35" width="22" height="2.4" fill="#f5f7fb" opacity="0.6"/>
      <path d="M25 39l4 4 3-6 3 4" fill="none" stroke="#a83030" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    coffee: `
      <path d="M16 22h24v15c0 6.5-5.4 11-12 11s-12-4.5-12-11Z" fill="#ece7db"/>
      <path d="M40 27h5c3 0 5 2 5 5s-2 5-5 5h-5" fill="none" stroke="#ece7db" stroke-width="4" stroke-linecap="round"/>
      <rect x="16" y="31" width="24" height="7" rx="1.5" fill="#8a5a3b"/>
      <path d="M23 18c-1 3 2 3 1 6M31 18c-1 3 2 3 1 6" fill="none" stroke="#a9b2c6" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M25 25c1.5 1 3.5 1 5 0" fill="none" stroke="#c9d0dd" stroke-width="2" stroke-linecap="round"/>`,
    water: `
      <rect x="24" y="22" width="16" height="26" rx="6" fill="#5aa7e0"/>
      <rect x="27" y="15" width="10" height="7" rx="2" fill="#2f5f8f"/>
      <rect x="24" y="33" width="16" height="9" fill="#dff0fb"/>
      <path d="M24 43c3 2 6-2 9 0s6-2 7 0" fill="none" stroke="#5aa7e0" stroke-width="2" stroke-linecap="round"/>
      <rect x="29" y="18" width="6" height="2.6" rx="1.3" fill="#cfe8fb"/>`,
    phone: `
      <rect x="16" y="9" width="32" height="46" rx="8" fill="#2f2670"/>
      <rect x="20" y="13" width="24" height="38" rx="3" fill="#7d8df0"/>
      <circle cx="32" cy="17" r="1.6" fill="#2f2670"/>
      <rect x="23" y="24" width="18" height="3" rx="1.5" fill="#ffffff" opacity="0.9"/>
      <rect x="23" y="30" width="13" height="3" rx="1.5" fill="#ffffff" opacity="0.65"/>
      <rect x="26" y="45" width="12" height="2.4" rx="1.2" fill="#2f2670"/>`,
    headphones: `
      <path d="M20 34v-5a12 12 0 0 1 24 0v5" fill="none" stroke="#3d6ea8" stroke-width="7" stroke-linecap="round"/>
      <rect x="13" y="32" width="11" height="17" rx="5.5" fill="#3d6ea8"/>
      <rect x="40" y="32" width="11" height="17" rx="5.5" fill="#3d6ea8"/>
      <rect x="16" y="36" width="5" height="9" rx="2.5" fill="#8fb2e8"/>
      <rect x="43" y="36" width="5" height="9" rx="2.5" fill="#8fb2e8"/>`,
    laptop: `
      <rect x="15" y="13" width="34" height="23" rx="3" fill="#7a5cd6"/>
      <rect x="18" y="16" width="28" height="17" rx="1.5" fill="#b9b0f5"/>
      <path d="M21 21h8M21 25.5h14M21 30h6" stroke="#5a4bb0" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 42h40l-3 7H15Z" fill="#4a3d99"/>
      <path d="M17 49h30" stroke="#7a5cd6" stroke-width="2.4" stroke-linecap="round"/>`,
    remote: `
      <rect x="22" y="8" width="20" height="48" rx="9" fill="#232a3f"/>
      <circle cx="32" cy="16" r="3" fill="#e0523f"/>
      <rect x="28" y="22" width="8" height="12" rx="1.5" fill="#3d6ea8"/>
      <rect x="24" y="26" width="16" height="4" rx="1.5" fill="#3d6ea8"/>
      <rect x="26" y="40" width="5" height="5" rx="2.5" fill="#6c768e"/>
      <rect x="33" y="40" width="5" height="5" rx="2.5" fill="#6c768e"/>
      <rect x="26" y="47" width="12" height="4" rx="2" fill="#3a4258"/>`,
  };

  const FALLBACK_ART = `
    <rect x="16" y="18" width="32" height="28" rx="3" fill="#ffd37a"/>
    <rect x="16" y="18" width="32" height="8" rx="3" fill="#e8890c"/>
    <path d="M16 26l16 8 16-8" fill="none" stroke="#b25f05" stroke-width="2"/>`;

  function face(inner) {
    return `<svg class="item-art" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="13" fill="#ffffff"/>
      <rect x="2" y="2" width="60" height="60" rx="13" fill="none" stroke="#d6dcec" stroke-width="1.5"/>
      <ellipse cx="32" cy="57" rx="21" ry="3.2" fill="#e3e8f4" opacity="0.8"/>
      ${inner}
    </svg>`;
  }

  function photo(item) {
    return face(ART[item.id] || FALLBACK_ART);
  }

  /* Deal a round: 2 originals + 2 decoys, shown as 4 cards. */
  function pickRound() {
    const pool = shuffle(catalog);
    const originals = pool.slice(0, 2);
    const decoys = pool.slice(2, 4);
    return {
      originals,
      choices: shuffle(originals.concat(decoys)),
    };
  }

  return { catalog, byId, shuffle, photo, pickRound };
})();
