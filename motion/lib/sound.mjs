/**
 * Sound design for the films — synthesised, not sampled.
 *
 *   node motion/lib/sound.mjs 01-the-journey
 *   node motion/lib/sound.mjs --all
 *
 * Every sound here is generated from noise and sine waves by the code
 * below, then muxed onto the rendered MP4. Three reasons it is done this
 * way rather than with a sample library:
 *
 *  1. **Licensing.** Nothing is downloaded, so nothing has to be cleared
 *     before the films can be used commercially.
 *  2. **Sync.** A cue is placed at a time in seconds, against a film whose
 *     frames were also generated from a time in seconds. The click lands on
 *     the frame the station opens, not near it.
 *  3. **Reproducibility.** Same seed, same bytes, every run — the same
 *     property the picture has.
 *
 * These are effects, not music: no notes, no key, no tempo. Air, impacts,
 * clicks and texture, and nothing that could be called a tune.
 */
import { spawn } from 'node:child_process';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const SR = 48000;

/* ── Primitives ──────────────────────────────────────────────────────── */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic noise. Math.random would make every render different. */
function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 2147483648 - 1; // -1..1
  };
}

const secs = (n) => Math.max(1, Math.round(n * SR));

/** Bell curve: in and out, no clicks at either end. */
const bell = (x, skew = 0.5) => {
  const p = clamp(x, 0, 1);
  return Math.sin(Math.PI * Math.pow(p, skew));
};

/** Percussive: instant attack, exponential tail. */
const decay = (x, k = 6) => Math.exp(-k * clamp(x, 0, 1));

/**
 * One-pole state-variable filter, coefficients recomputed per sample so
 * the cutoff can sweep continuously — which is what turns flat noise into
 * a whoosh with a direction.
 */
function svf(input, freqAt, qAt, mode = 'band') {
  const out = new Float32Array(input.length);
  let low = 0;
  let band = 0;
  for (let i = 0; i < input.length; i++) {
    const t = i / input.length;
    const f = 2 * Math.sin((Math.PI * clamp(freqAt(t), 20, SR * 0.45)) / SR);
    const q = 1 / Math.max(0.5, qAt(t));
    const high = input[i] - low - q * band;
    band += f * high;
    low += f * band;
    out[i] = mode === 'band' ? band : mode === 'low' ? low : high;
  }
  return out;
}

/* ── Effects ─────────────────────────────────────────────────────────── */

/** Air moving past. The sweep is the direction of travel. */
function whoosh(dur, { from = 300, to = 3200, q = 1.6, gain = 0.5, seed = 1 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r();
  const filtered = svf(raw, (t) => from + (to - from) * t, () => q, 'band');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = filtered[i] * bell(i / n, 0.8) * gain;
  return out;
}

/** Something arriving and stopping. Body plus a transient. */
function impact(dur, { freq = 150, drop = 0.35, gain = 0.6, seed = 2, k = 7 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = freq * (drop + (1 - drop) * Math.exp(-5 * t));
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * decay(t, k);
    const crack = r() * decay(t, 70) * 0.5;
    out[i] = (body + crack) * gain;
  }
  return out;
}

/** A switch, a lock, a stop landing. Very short, very dry. */
function click(dur = 0.06, { tone = 2100, gain = 0.4, seed = 3 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r() * decay(i / n, 34);
  const shaped = svf(raw, () => tone, () => 1.1, 'band');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = shaped[i] * gain;
  return out;
}

/** Tension building toward something. */
function riser(dur, { from = 180, to = 5200, gain = 0.34, seed = 4 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r();
  const filtered = svf(raw, (t) => from * Math.pow(to / from, t * t), () => 2.4, 'band');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    out[i] = filtered[i] * Math.pow(t, 1.6) * gain;
  }
  return out;
}

/** Fine bright specks — used where something resolves or appears. */
function shimmer(dur, { gain = 0.24, seed = 5, count = 46 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const out = new Float32Array(n);
  for (let s = 0; s < count; s++) {
    const at = Math.floor(((r() + 1) / 2) * n * 0.75);
    const len = secs(0.04 + ((r() + 1) / 2) * 0.09);
    const tone = 3400 + ((r() + 1) / 2) * 5200;
    let phase = 0;
    for (let i = 0; i < len && at + i < n; i++) {
      phase += (2 * Math.PI * tone) / SR;
      out[at + i] += Math.sin(phase) * decay(i / len, 12) * gain * 0.32;
    }
  }
  return out;
}

/** Continuous pouring: noise with a restless throat. */
function liquid(dur, { gain = 0.3, seed = 6 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r();
  const filtered = svf(
    raw,
    (t) => 520 + 380 * Math.sin(t * 34) + 180 * Math.sin(t * 111),
    () => 3.4,
    'band',
  );
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const flutter = 0.72 + 0.28 * Math.sin(t * 190) * Math.sin(t * 57);
    out[i] = filtered[i] * flutter * bell(t, 0.25) * gain;
  }
  return out;
}

/** Weight under an event. Felt more than heard. */
function sub(dur, { freq = 52, gain = 0.5, k = 5 } = {}) {
  const n = secs(dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (2 * Math.PI * freq * (1 - 0.25 * t)) / SR;
    out[i] = Math.sin(phase) * decay(t, k) * gain;
  }
  return out;
}

/** A very quiet bed so the silences are not digital. */
function room(dur, { gain = 0.035, seed = 9 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r();
  const filtered = svf(raw, () => 620, () => 0.7, 'low');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = filtered[i] * gain;
  return out;
}

/**
 * A second vocabulary, for the film that needs a grander register than
 * clicks and whooshes. Swells instead of risers, booms instead of impacts,
 * and air that is granular rather than smooth.
 */

/** Plays any effect backwards — the pre-roll that makes a hit feel earned. */
function reversed(src) {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[src.length - 1 - i];
  return out;
}

/** Long, warm, opening. Nothing percussive about it. */
function swell(dur, { from = 90, to = 1100, gain = 0.4, seed = 61 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = r();
  const filtered = svf(raw, (t) => from + (to - from) * Math.pow(t, 1.8), () => 0.9, 'low');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    out[i] = filtered[i] * Math.pow(t, 2.2) * gain;
  }
  return out;
}

/** The pre-roll: a swell played backwards, so it sucks inward into the hit. */
function inhale(dur, opts = {}) {
  return reversed(swell(dur, { gain: 0.42, ...opts }));
}

/** Deep, round, long-tailed. Weight with dignity rather than a crack. */
function boom(dur, { freq = 58, gain = 0.72, seed = 62 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const out = new Float32Array(n);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = freq * (0.55 + 0.45 * Math.exp(-3.2 * t));
    p1 += (2 * Math.PI * f) / SR;
    p2 += (2 * Math.PI * f * 1.98) / SR;
    const body = (Math.sin(p1) + Math.sin(p2) * 0.3) * decay(t, 2.4);
    const air = r() * decay(t, 26) * 0.16;
    out[i] = (body + air) * gain;
  }
  return out;
}

/** Air with grain in it — a big wing, not a passing car. */
function rush(dur, { from = 400, to = 2600, gain = 0.5, seed = 63, grains = 130 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const raw = new Float32Array(n);
  for (let g = 0; g < grains; g++) {
    const at = Math.floor(((r() + 1) / 2) * n);
    const len = secs(0.012 + ((r() + 1) / 2) * 0.05);
    for (let i = 0; i < len && at + i < n; i++) {
      raw[at + i] += r() * bell(i / len, 1) * 0.5;
    }
  }
  const filtered = svf(raw, (t) => from + (to - from) * Math.sin(t * Math.PI * 0.6), () => 1.3, 'band');
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = filtered[i] * bell(i / n, 0.7) * gain;
  return out;
}

/** Light falling away — bright specks that descend instead of rising. */
function fallingLight(dur, { gain = 0.24, seed = 64, count = 40 } = {}) {
  const n = secs(dur);
  const r = rng(seed);
  const out = new Float32Array(n);
  for (let s2 = 0; s2 < count; s2++) {
    const k = s2 / count;
    const at = Math.floor(k * n * 0.8);
    const len = secs(0.05 + ((r() + 1) / 2) * 0.1);
    const tone = 6800 - k * 4200;
    let phase = 0;
    for (let i = 0; i < len && at + i < n; i++) {
      phase += (2 * Math.PI * tone) / SR;
      out[at + i] += Math.sin(phase) * decay(i / len, 11) * gain * 0.3;
    }
  }
  return out;
}

const FX = { whoosh, impact, click, riser, shimmer, liquid, sub, room, swell, inhale, boom, rush, fallingLight };

/* ── Mixing ──────────────────────────────────────────────────────────── */

function mix(into, src, atSeconds, { gain = 1, pan = 0 } = {}) {
  const start = Math.round(atSeconds * SR);
  const l = Math.cos(((pan + 1) * Math.PI) / 4);
  const r = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < src.length; i++) {
    const k = start + i;
    if (k < 0 || k >= into.left.length) continue;
    into.left[k] += src[i] * gain * l * Math.SQRT2 * 0.707;
    into.right[k] += src[i] * gain * r * Math.SQRT2 * 0.707;
  }
}

/** 16-bit stereo WAV. */
function wav(left, right) {
  const n = left.length;
  const bytes = Buffer.alloc(44 + n * 4);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + n * 4, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(SR, 24);
  bytes.writeUInt32LE(SR * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    bytes.writeInt16LE(Math.round(clamp(left[i], -1, 1) * 32767), 44 + i * 4);
    bytes.writeInt16LE(Math.round(clamp(right[i], -1, 1) * 32767), 46 + i * 4);
  }
  return bytes;
}

/** Peak-normalise to -3 dBFS, then fade the very ends. */
function master(track, dur) {
  let peak = 0;
  for (let i = 0; i < track.left.length; i++) {
    peak = Math.max(peak, Math.abs(track.left[i]), Math.abs(track.right[i]));
  }
  const g = peak > 0 ? 0.708 / peak : 1;
  const fade = secs(0.05);
  const n = track.left.length;
  for (let i = 0; i < n; i++) {
    let e = g;
    if (i < fade) e *= i / fade;
    if (i > n - fade) e *= (n - i) / fade;
    track.left[i] *= e;
    track.right[i] *= e;
  }
  void dur;
}

/* ── The cue sheets ──────────────────────────────────────────────────── */

/**
 * Each entry is [seconds, effect, duration, options]. Times are read off
 * the film's own `renderFrame`, so a cue and the frame it belongs to come
 * from the same number.
 */
const SCORES = {
  '01-the-journey': {
    duration: 10,
    cues: [
      [0.0, 'room', 10, { gain: 0.03 }],
      // The line appears, then the money sets off.
      [0.35, 'riser', 0.9, { from: 150, to: 2600, gain: 0.3 }],
      [0.72, 'whoosh', 0.55, { from: 260, to: 1400, gain: 0.34, pan: -0.7 }],
      // Four stops. Each is a click plus a little weight, panned along
      // the frame so the sound travels with the picture.
      [1.72, 'click', 0.07, { tone: 2300, gain: 0.5, pan: -0.62 }],
      [1.72, 'sub', 0.34, { freq: 96, gain: 0.3, pan: -0.62 }],
      [3.18, 'click', 0.07, { tone: 2500, gain: 0.5, pan: -0.22 }],
      [3.18, 'sub', 0.34, { freq: 104, gain: 0.3, pan: -0.22 }],
      [4.55, 'click', 0.07, { tone: 2700, gain: 0.5, pan: 0.22 }],
      [4.55, 'sub', 0.34, { freq: 112, gain: 0.3, pan: 0.22 }],
      [5.95, 'click', 0.07, { tone: 2900, gain: 0.52, pan: 0.62 }],
      [5.95, 'sub', 0.34, { freq: 120, gain: 0.32, pan: 0.62 }],
      // Travel between the stops.
      [2.0, 'whoosh', 1.0, { from: 420, to: 1800, gain: 0.2, pan: -0.4, seed: 11 }],
      [3.4, 'whoosh', 1.0, { from: 500, to: 2000, gain: 0.2, pan: 0, seed: 12 }],
      [4.8, 'whoosh', 1.0, { from: 560, to: 2200, gain: 0.2, pan: 0.4, seed: 13 }],
      // Four become one.
      [7.05, 'whoosh', 1.05, { from: 2600, to: 320, gain: 0.44, seed: 14 }],
      [8.02, 'impact', 0.75, { freq: 170, gain: 0.62 }],
      [8.02, 'sub', 0.9, { freq: 46, gain: 0.5, k: 3.4 }],
      [8.4, 'shimmer', 1.5, { gain: 0.2, seed: 15 }],
      [8.78, 'whoosh', 0.7, { from: 1400, to: 4200, gain: 0.16, seed: 16 }],
    ],
  },

  '02-pour': {
    duration: 8,
    cues: [
      [0.0, 'room', 8, { gain: 0.03 }],
      // The spout opens.
      [0.2, 'click', 0.09, { tone: 1500, gain: 0.42, pan: -0.72 }],
      [0.2, 'whoosh', 0.5, { from: 200, to: 1100, gain: 0.26, pan: -0.72 }],
      // It pours, and keeps pouring.
      [0.5, 'liquid', 5.1, { gain: 0.42, seed: 21 }],
      [0.5, 'whoosh', 1.4, { from: 700, to: 340, gain: 0.16, pan: -0.4, seed: 22 }],
      // The vessel fills: the throat of the sound rises with the level.
      [1.3, 'riser', 4.2, { from: 120, to: 1500, gain: 0.2, seed: 23 }],
      // Full.
      [5.6, 'impact', 0.85, { freq: 140, gain: 0.6 }],
      [5.6, 'sub', 1.0, { freq: 44, gain: 0.52, k: 3.2 }],
      [5.7, 'shimmer', 1.4, { gain: 0.2, seed: 24 }],
      [6.45, 'whoosh', 0.65, { from: 1200, to: 3800, gain: 0.15, seed: 25 }],
    ],
  },

  '03-swarm': {
    duration: 8,
    cues: [
      [0.0, 'room', 8, { gain: 0.032 }],
      // Thousands of small things gathering.
      [0.5, 'shimmer', 2.2, { gain: 0.16, seed: 31, count: 90 }],
      [0.85, 'riser', 1.9, { from: 200, to: 3400, gain: 0.3, seed: 32 }],
      [2.6, 'impact', 0.7, { freq: 155, gain: 0.5 }],
      [2.6, 'sub', 0.8, { freq: 48, gain: 0.42, k: 4 }],
      // Swept apart.
      [3.7, 'whoosh', 1.2, { from: 340, to: 3000, gain: 0.46, pan: 0.5, seed: 33 }],
      [3.8, 'shimmer', 1.6, { gain: 0.14, seed: 34, count: 70 }],
      // And back together.
      [5.3, 'whoosh', 0.95, { from: 2800, to: 420, gain: 0.4, pan: -0.3, seed: 35 }],
      [5.5, 'riser', 1.1, { from: 320, to: 4200, gain: 0.24, seed: 36 }],
      [6.35, 'impact', 0.8, { freq: 165, gain: 0.58 }],
      [6.35, 'sub', 0.95, { freq: 45, gain: 0.5, k: 3.3 }],
      [6.5, 'shimmer', 1.3, { gain: 0.22, seed: 37 }],
    ],
  },

  /*
   * A different voice from the other three. That film set is navy and
   * weighted; this one is a bright room, so the effects are airier, the
   * sub is lighter, and the burst is a snap of air rather than a thud.
   * Same synth, different register.
   */
  /*
   * A different vocabulary from the other three entirely. They are built
   * from clicks, whooshes and subs; this one is swells, booms and granular
   * air. The hit at the centre is set up by an inhale — a swell played
   * backwards, so the frame pulls inward before it opens.
   */
  '04-out-of-the-screen': {
    duration: 9,
    cues: [
      [0.0, 'room', 9, { gain: 0.024, seed: 71 }],
      // The machine arrives, and the room settles around it.
      [0.3, 'swell', 1.3, { from: 120, to: 900, gain: 0.26, seed: 72 }],
      [1.45, 'boom', 0.9, { freq: 74, gain: 0.3, seed: 73 }],
      // The screen wakes.
      [1.2, 'fallingLight', 1.2, { gain: 0.15, seed: 74, count: 26 }],
      // The pre-roll. This is the whole reason the hit feels earned.
      [2.25, 'inhale', 1.3, { from: 160, to: 3600, gain: 0.46, seed: 75 }],
      // Out. Deep and long, not sharp.
      [3.52, 'boom', 2.4, { freq: 52, gain: 0.78, seed: 76 }],
      [3.5, 'rush', 1.15, { from: 700, to: 3400, gain: 0.5, seed: 77 }],
      [3.62, 'shimmer', 1.5, { gain: 0.2, seed: 78, count: 54 }],
      // Two slow wings as it climbs. Granular air, panned wide.
      [4.35, 'rush', 0.6, { from: 260, to: 1500, gain: 0.36, pan: -0.45, seed: 79, grains: 70 }],
      [5.05, 'rush', 0.6, { from: 240, to: 1400, gain: 0.3, pan: 0.42, seed: 80, grains: 70 }],
      // It takes its place.
      [6.0, 'boom', 1.5, { freq: 62, gain: 0.4, seed: 81 }],
      [6.1, 'swell', 0.9, { from: 400, to: 2600, gain: 0.18, seed: 82 }],
      [6.55, 'fallingLight', 1.3, { gain: 0.18, seed: 83, count: 34 }],
      // The lines land.
      [7.0, 'click', 0.07, { tone: 1400, gain: 0.2 }],
      [7.42, 'click', 0.07, { tone: 1100, gain: 0.16 }],
    ],
  },
};

/* ── Build ───────────────────────────────────────────────────────────── */

const motionDir = fileURLToPath(new URL('../', import.meta.url));

async function build(name) {
  const score = SCORES[name];
  if (!score) throw new Error(`No score for "${name}". Known: ${Object.keys(SCORES).join(', ')}`);

  const n = secs(score.duration);
  const track = { left: new Float32Array(n), right: new Float32Array(n) };

  for (const [at, kind, dur, opts = {}] of score.cues) {
    const make = FX[kind];
    if (!make) throw new Error(`Unknown effect "${kind}"`);
    const { pan = 0, ...rest } = opts;
    mix(track, make(dur, rest), at, { pan });
  }
  master(track, score.duration);

  const audioDir = join(motionDir, '.audio');
  await mkdir(audioDir, { recursive: true });
  const wavPath = join(audioDir, `${name}.wav`);
  await writeFile(wavPath, wav(track.left, track.right));

  const video = join(motionDir, 'out', `${name}.mp4`);
  const tmp = join(motionDir, 'out', `${name}.tmp.mp4`);

  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-i', video,
        '-i', wavPath,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        tmp,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let err = '';
    ff.stderr.on('data', (d) => (err += d));
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-1500)))));
  });

  await rm(video, { force: true });
  await rename(tmp, video);
  await rm(wavPath, { force: true });
  console.log(`  ${name}: ${score.cues.length} cues → ${video}`);
}

const args = process.argv.slice(2);
const wanted = args.includes('--all') ? Object.keys(SCORES) : args;
if (!wanted.length) {
  console.error('usage: node motion/lib/sound.mjs <film> | --all');
  process.exit(1);
}
for (const name of wanted) await build(name);
