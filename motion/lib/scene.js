/**
 * Shared toolkit for the Shaheen Money films.
 *
 * Every scene is a pure function of time: `renderFrame(t)` sets the whole
 * stage for second `t` and nothing carries state between frames. That is
 * what lets the renderer step frames instead of recording them, and it
 * means a scene can be scrubbed, re-rendered at any frame rate, or resumed
 * from the middle and look identical.
 */

/* ── Brand ─────────────────────────────────────────────────────────────
 * Kept in step with design/tokens.json.                                */
export const NAVY = '#071138';
export const NAVY_800 = '#0c1a4d';
export const NAVY_600 = '#142a6e';
export const DEEP = '#03081f';
export const CYAN = '#00e1ff';
export const BLUE = '#1400ff';
export const WHITE = '#ffffff';

/* ── Timing ────────────────────────────────────────────────────────── */

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (a, b, t) => lerp(a, b, clamp(t));

/** Normalised progress through the window [from, to], clamped to 0–1. */
export const span = (t, from, to) => clamp((t - from) / (to - from));

/** Progress through [from, to] with an easing applied. */
export const ease = (t, from, to, fn = easeInOut) => fn(span(t, from, to));

export const linear = (x) => x;
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x) => x * x * x;
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
export const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

/** Overshoots and settles — for something arriving with weight. */
export const easeOutBack = (x, amount = 1.3) => {
  const c3 = amount + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + amount * Math.pow(x - 1, 2);
};

/** 0 → 1 → 0 across the window: a pulse that returns to rest. */
export const pulse = (t, from, to, fn = easeInOut) => {
  const p = span(t, from, to);
  return fn(p < 0.5 ? p * 2 : (1 - p) * 2);
};

/** Cubic Bézier easing, the same curves the site's CSS uses. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const d = sampleX(u) - x;
      if (Math.abs(d) < 1e-6) break;
      const s = slopeX(u);
      if (Math.abs(s) < 1e-6) break;
      u -= d / s;
    }
    return sampleY(u);
  };
}

/** The site's --ease-out, so the films move the way the interface does. */
export const brandEaseOut = cubicBezier(0.2, 0.8, 0.2, 1);

/* ── Helpers ───────────────────────────────────────────────────────── */

export const el = (id) => document.getElementById(id);

/** Set many attributes at once. */
export const attrs = (node, map) => {
  for (const [k, v] of Object.entries(map)) node.setAttribute(k, String(v));
};

/** rgba() from a #rrggbb and an alpha. */
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * A deterministic pseudo-random sequence. Films must render identically
 * every time, so nothing here is allowed to call Math.random().
 */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Point along a sampled polyline at 0–1, with the local heading. */
export function alongPoints(points, p) {
  const n = points.length - 1;
  const f = clamp(p) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const k = f - i;
  const [x0, y0] = points[i];
  const [x1, y1] = points[i + 1];
  return {
    x: lerp(x0, x1, k),
    y: lerp(y0, y1, k),
    angle: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI,
  };
}
