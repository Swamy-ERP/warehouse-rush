/* Web Audio — a driving warehouse groove with a tempo ramp, plus SFX.
   Everything is synthesized locally; no audio files, no network. */
const AudioFx = (() => {
  let muted = false;
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let noiseCache = null;
  let musicPlaying = false;
  let intensity = 0; // 0 calm · 1 warning · 2 urgent
  let nextNote = 0;
  let step16 = 0;
  let schedulerId = 0;

  const TEMPO = [116, 128, 148]; // bpm per intensity level
  const ROOT = 55; // A1

  function context() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return null;
      }
      ctx = new Ctor();
      master = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      musicGain.gain.value = 0.22;
      sfxGain.gain.value = 0.28;
      musicGain.connect(master);
      sfxGain.connect(master);
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function unlock() {
    const audio = context();
    if (!audio) {
      return;
    }
    const buffer = audio.createBuffer(1, 1, 22050);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start(0);
  }

  function applyMute() {
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    }
  }

  function noiseBuffer() {
    if (!ctx) {
      return null;
    }
    if (!noiseCache) {
      const length = Math.floor(ctx.sampleRate * 1);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      noiseCache = buffer;
    }
    return noiseCache;
  }

  /* Filtered noise burst through a gain envelope. */
  function noiseHit(when, duration, freq, peak, type) {
    const audio = context();
    if (!audio || !sfxGain) {
      return;
    }
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer();
    const filter = audio.createBiquadFilter();
    filter.type = type || "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(peak, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    src.start(when);
    src.stop(when + duration + 0.02);
  }

  function tone(freq, duration, type, dest, when) {
    const audio = context();
    if (!audio || !dest) {
      return;
    }
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = when || audio.currentTime;
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.9, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  function beep(freq, duration, type) {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    tone(freq, duration, type, sfxGain);
  }

  /* ============================================================
     Music engine — 16th-note lookahead scheduler, four-on-the-floor
     ============================================================ */

  function currentTempo() {
    return TEMPO[Math.max(0, Math.min(2, intensity))];
  }

  function stepDur() {
    return 60 / currentTempo() / 4; // one 16th note
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.17);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  function snare(time) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.15);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.08);
    og.gain.setValueAtTime(0.3, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(og);
    og.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  function hat(time, accent) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    const peak = accent ? 0.22 : 0.12;
    gain.gain.setValueAtTime(peak, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start(time);
    src.stop(time + 0.07);
  }

  const BASSPAT = [0, 0, 12, 0, 3, 3, 15, 3, 5, 5, 17, 5, 3, 3, 15, 3];

  function bass(time, k) {
    const semi = BASSPAT[k];
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = ROOT * Math.pow(2, semi / 12);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.09);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  const LEAD_ON = [8, 10, 12, 14];

  function lead(time, k) {
    const octave = k >= 12 ? 2 : 1;
    const semi = k === 8 || k === 12 ? 12 : 19; // A4 or E5 over A3
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = (ROOT * 4) * Math.pow(2, semi / 12) * octave;
    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.16);
  }

  function scheduleStep(time, s) {
    const k = s % 16;
    if (k % 4 === 0) {
      kick(time);
    }
    if (k % 8 === 4) {
      snare(time);
    }
    if (k % 2 === 0) {
      hat(time, k % 4 === 0);
    }
    bass(time, k);
    if (LEAD_ON.includes(k)) {
      lead(time, k);
    }
  }

  function musicLoop() {
    if (!musicPlaying || !ctx) {
      return;
    }
    if (ctx.state !== "running") {
      return; // wait until resumed, don't schedule into a frozen clock
    }
    while (nextNote < ctx.currentTime + 0.12) {
      scheduleStep(nextNote, step16);
      nextNote += stepDur();
      step16 = (step16 + 1) % 16;
    }
  }

  function startMusic() {
    unlock();
    if (musicPlaying) {
      return;
    }
    musicPlaying = true;
    step16 = 0;
    nextNote = ctx ? ctx.currentTime + 0.06 : 0;
    if (!schedulerId) {
      schedulerId = window.setInterval(musicLoop, 30);
    }
  }

  function stopMusic() {
    musicPlaying = false;
    if (schedulerId) {
      window.clearInterval(schedulerId);
      schedulerId = 0;
    }
  }

  function setIntensity(level) {
    intensity = level;
  }

  /* ============================================================
     SFX
     ============================================================ */

  function flip() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    noiseHit(t, 0.06, 3200, 0.2);
    tone(620, 0.05, "triangle", sfxGain, t);
    tone(930, 0.05, "triangle", sfxGain, t + 0.02);
  }

  function tile() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    tone(340, 0.07, "square", sfxGain, t);
    noiseHit(t, 0.04, 5200, 0.14);
  }

  function horn() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    tone(311, 0.4, "sawtooth", sfxGain, t);
    tone(392, 0.4, "sawtooth", sfxGain, t);
    tone(311, 0.3, "sawtooth", sfxGain, t + 0.5);
    tone(392, 0.3, "sawtooth", sfxGain, t + 0.5);
  }

  function rumble() {
    const audio = context();
    if (!audio || muted) {
      return;
    }
    tone(70, 0.45, "sawtooth", sfxGain);
    tone(90, 0.35, "triangle", sfxGain);
  }

  function boost() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    tone(440, 0.08, "sawtooth", sfxGain, t);
    tone(660, 0.08, "sawtooth", sfxGain, t + 0.06);
    tone(880, 0.12, "sawtooth", sfxGain, t + 0.12);
  }

  function reveal() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    tone(880, 0.1, "sine", sfxGain, t);
    tone(1175, 0.16, "sine", sfxGain, t + 0.09);
  }

  function correct() {
    beep(660, 0.13, "triangle");
    window.setTimeout(() => beep(880, 0.15, "triangle"), 90);
  }

  function reject() {
    if (muted) {
      return;
    }
    const audio = context();
    if (!audio) {
      return;
    }
    const t = audio.currentTime;
    tone(180, 0.12, "square", sfxGain, t);
    tone(140, 0.14, "square", sfxGain, t + 0.1);
  }

  function wrong() {
    const audio = context();
    if (!audio || muted) {
      return;
    }
    const t = audio.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(196, t);
    osc.frequency.exponentialRampToValueAtTime(128, t + 0.3);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.34);
    noiseHit(t, 0.18, 700, 0.28, "lowpass");
  }

  function warn() {
    beep(523, 0.16, "square");
  }

  function urgent() {
    beep(392, 0.12, "square");
    window.setTimeout(() => beep(392, 0.12, "square"), 140);
    window.setTimeout(() => beep(523, 0.14, "square"), 280);
  }

  function complete() {
    beep(523, 0.12, "triangle");
    window.setTimeout(() => beep(659, 0.12, "triangle"), 100);
    window.setTimeout(() => beep(784, 0.18, "triangle"), 200);
  }

  function timeup() {
    stopMusic();
    beep(220, 0.4, "sine");
  }

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = Boolean(value);
    applyMute();
    return muted;
  }

  function toggle() {
    muted = !muted;
    applyMute();
    if (!muted) {
      unlock();
      if (!musicPlaying) {
        startMusic();
      }
    }
    return muted;
  }

  return {
    unlock,
    context,
    startMusic,
    stopMusic,
    setIntensity,
    flip,
    tile,
    horn,
    boost,
    reveal,
    reject,
    correct,
    wrong,
    warn,
    urgent,
    complete,
    timeup,
    rumble,
    isMuted,
    setMuted,
    toggle,
  };
})();
