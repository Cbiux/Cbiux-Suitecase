const BPM = 88;
const BEAT = 60 / BPM;

const BARS: number[][] = [
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [43, 47, 50, 53],
  [48, 52, 55, 59],
  [50, 53, 57, 60],
  [41, 45, 48, 52],
  [43, 47, 50, 55],
];

function midiHz(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}

function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  {
    freq,
    start,
    dur,
    type,
    gain,
    attack,
    release,
    detune = 0,
  }: {
    freq: number;
    start: number;
    dur: number;
    type: OscillatorType;
    gain: number;
    attack: number;
    release: number;
    detune?: number;
  },
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const peak = start + Math.min(attack, dur * 0.4);
  const fade = start + Math.max(dur - release, attack);
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, peak);
  amp.gain.setValueAtTime(gain, fade);
  amp.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(amp);
  amp.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function scheduleScore(ctx: BaseAudioContext, dest: AudioNode, t0: number, seconds: number) {
  const end = t0 + seconds + 1.2;
  let t = t0;
  let bar = 0;
  while (t < end) {
    const chord = BARS[bar % BARS.length];
    const barDur = BEAT * 4;
    const padDur = barDur + 0.18;
    chord.forEach((note, index) => {
      tone(ctx, dest, {
        freq: midiHz(note),
        start: t,
        dur: padDur,
        type: "sine",
        gain: index === 0 ? 0.055 : 0.032,
        attack: 0.22,
        release: 0.35,
      });
      tone(ctx, dest, {
        freq: midiHz(note),
        start: t,
        dur: padDur,
        type: "triangle",
        gain: 0.012,
        attack: 0.28,
        release: 0.4,
        detune: 6,
      });
    });
    tone(ctx, dest, {
      freq: midiHz(chord[0] - 12),
      start: t,
      dur: BEAT * 1.35,
      type: "sine",
      gain: 0.08,
      attack: 0.03,
      release: 0.45,
    });
    tone(ctx, dest, {
      freq: midiHz(chord[0] - 12),
      start: t + BEAT * 2,
      dur: BEAT * 1.2,
      type: "sine",
      gain: 0.055,
      attack: 0.03,
      release: 0.4,
    });
    for (let step = 0; step < 8; step += 1) {
      if (step % 2 === 1) continue;
      const note = chord[step % chord.length];
      tone(ctx, dest, {
        freq: midiHz(note + 12),
        start: t + step * (BEAT / 2),
        dur: 0.22,
        type: "sine",
        gain: 0.028,
        attack: 0.01,
        release: 0.16,
      });
    }
    t += barDur;
    bar += 1;
  }
}

export type ReelMusic = {
  track: MediaStreamTrack;
  stop: () => Promise<void>;
};

export async function startReelMusic(options: {
  seconds: number;
  hear: boolean;
  volume?: number;
}): Promise<ReelMusic> {
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("AUDIO");
  const ctx = new Ctor();
  if (ctx.state === "suspended") await ctx.resume();
  const dest = ctx.createMediaStreamDestination();
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1750;
  filter.Q.value = 0.65;
  const vol = options.volume ?? 0.2;
  const t0 = ctx.currentTime + 0.04;
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(vol, t0 + 0.55);
  const fadeAt = t0 + Math.max(1, options.seconds - 0.85);
  master.gain.setValueAtTime(vol, fadeAt);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + options.seconds);
  filter.connect(master);
  master.connect(dest);
  if (options.hear) {
    const monitor = ctx.createGain();
    monitor.gain.value = 0.62;
    master.connect(monitor);
    monitor.connect(ctx.destination);
  }
  scheduleScore(ctx, filter, t0, options.seconds);
  const track = dest.stream.getAudioTracks()[0];
  if (!track) throw new Error("AUDIO");
  return {
    track,
    stop: async () => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      dest.stream.getTracks().forEach((item) => item.stop());
      await ctx.close().catch(() => undefined);
    },
  };
}

export async function renderReelMusic(seconds: number, volume = 0.2) {
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(sampleRate * seconds)), sampleRate);
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1750;
  filter.Q.value = 0.65;
  const t0 = 0.04;
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(volume, t0 + 0.55);
  const fadeAt = t0 + Math.max(1, seconds - 0.85);
  master.gain.setValueAtTime(volume, fadeAt);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  filter.connect(master);
  master.connect(ctx.destination);
  scheduleScore(ctx, filter, t0, seconds);
  return ctx.startRendering();
}
