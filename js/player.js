const Player = (() => {
  const MAX_LEN = 24;
  let name = "";

  function validate(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) {
      return { ok: false, message: "Name is required. Please enter a name to continue." };
    }
    if (trimmed.length > MAX_LEN) {
      return { ok: false, message: `Please keep the name to ${MAX_LEN} characters or fewer.` };
    }
    return { ok: true, value: trimmed };
  }

  function setName(value) {
    name = value;
  }

  function getName() {
    return name;
  }

  function resetKeepName() {
    return name;
  }

  return { validate, setName, getName, resetKeepName, MAX_LEN };
})();
