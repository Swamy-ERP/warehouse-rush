const Memory = (() => {
  let originals = [];
  let choices = [];
  let selected = [];
  let locked = false;
  let onResolved = () => {};

  function cardMarkup(item, interactive, index) {
    const state = interactive ? "Tap to choose" : "Remember this";
    const tag = interactive ? "button" : "div";
    const extras = interactive
      ? `type="button" data-item-id="${item.id}"`
      : `role="img" aria-label="${item.name}"`;
    return `<${tag} class="item-card${interactive ? "" : " flash-card"}" ${extras} style="--i:${index}">
      ${Items.photo(item)}
      <span class="item-name">${item.name}</span>
      <span class="item-state">${state}</span>
    </${tag}>`;
  }

  function renderFlash(root) {
    root.innerHTML = `<div class="card-row card-row-2">${originals.map((item, i) => cardMarkup(item, false, i)).join("")}</div>`;
  }

  function renderChoices(root) {
    root.innerHTML = `<div class="card-grid card-grid-4">${choices.map((item, i) => cardMarkup(item, true, i)).join("")}</div>`;
    root.querySelectorAll("[data-item-id]").forEach((btn) => {
      btn.addEventListener("click", () => choose(btn.getAttribute("data-item-id"), root));
    });
  }

  /* Selections update the cards in place — no grid re-render between picks.
     The pair is verified only after the second card is tapped. */
  function choose(id, root) {
    if (locked) {
      return;
    }
    const btn = root.querySelector(`[data-item-id="${id}"]`);
    if (selected.includes(id)) {
      selected = selected.filter((value) => value !== id);
      if (btn) {
        btn.classList.remove("is-selected");
        const state = btn.querySelector(".item-state");
        if (state) {
          state.textContent = "Tap to choose";
        }
      }
      return;
    }
    if (selected.length >= 2) {
      return;
    }
    selected.push(id);
    if (btn) {
      btn.classList.add("is-selected");
      btn.classList.add("is-locked");
      const state = btn.querySelector(".item-state");
      if (state) {
        state.textContent = "Selected";
      }
    }
    if (selected.length === 2) {
      locked = true;
      const ok = selected.every((value) => originals.some((item) => item.id === value));
      onResolved({ ok, selected: selected.slice(), originals: originals.slice() });
    }
  }

  function start(hooks) {
    const deal = Items.pickRound();
    originals = deal.originals;
    choices = deal.choices;
    selected = [];
    locked = false;
    onResolved = hooks.onResolved || (() => {});
    return { originals, choices };
  }

  function retry() {
    selected = [];
    locked = false;
  }

  function getOriginals() {
    return originals.slice();
  }

  function reset() {
    originals = [];
    choices = [];
    selected = [];
    locked = false;
  }

  return { start, retry, renderFlash, renderChoices, getOriginals, reset };
})();
