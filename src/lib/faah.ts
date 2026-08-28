/**
 * The famous Gen-Z "FAAAAAAH" fail scream, a real voice audio asset
 * (public/sfx/faah.mp3), with the Web Audio honk kept as a fallback.
 */
let audioEl: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;

export function playFaah() {
  if (typeof window === "undefined") return;

  try {
    if (!audioEl) audioEl = new Audio("/sfx/faah.mp3");
    audioEl.currentTime = 0;
    audioEl.volume = 1;
    const p = audioEl.play();
    if (p) p.catch(() => playFallbackHonk());
    return;
  } catch {
    playFallbackHonk();
  }
}

function getCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function playFallbackHonk() {
  const audio = getCtx();
  if (!audio) return;
  void audio.resume();

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.55, now + 0.06);
  master.gain.setValueAtTime(0.55, now + 0.85);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 1.2);

  master.connect(filter);
  filter.connect(audio.destination);

  [110, 138.6].forEach((freq, i) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq, now + 0.55);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.62, now + 1.15);

    const g = audio.createGain();
    g.gain.value = i === 0 ? 0.6 : 0.35;
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 1.3);
  });
}
