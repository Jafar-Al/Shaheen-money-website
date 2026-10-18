# Shaheen Money — motion

> **بالعربي باختصار:** ثلاث فيديوهات موشن جرافيك، كل وحدة 10 ثواني، كلهم بألوان شاهين: الكحلي والسماوي والأبيض والأزرق. وكل حركة فيهم إلها معنى — ما في حركة موجودة عشان تعبّي الشاشة. أمر واحد بيعيد رندرتهم: `npm run motion`

Three films, ten seconds each, 1920×1080 at 60fps, all in the brand palette.

| | Film | What the motion is *for* | Technique |
|---|---|---|---|
| **01** | **The journey** | Shows what the app actually does, silently, in ten seconds: money travels one unbroken line through four stops, and the four stops then collapse into one app. | One drawn path, timed off its own arc length |
| **02** | **Pour** | Money arriving and gathering: one balance filling one wallet. | Gooey-filter metaballs |
| **03** | **Swarm** | Connectors are people, not machines: thousands of separate points that only mean something together. | 3,200 canvas particles |

```bash
npm run motion            # all three into motion/out/
npm run motion:preview    # 12fps, for a fast look
node motion/lib/render.mjs 02-pour        # just one
```

## The rule these are built on

**Every movement has to carry information.** If a thing moves and the viewer
learns nothing from it moving, it comes out.

In film 01 that rule is the whole structure: there is exactly one moving
object — the money — and every other movement on screen is a *consequence*
of it arriving somewhere. Stations do not pop in on a timer; each one lights
at the moment the money physically reaches it, because its cue is computed
from the path's own arc length. Labels stay up once earned, so by the last
second all four steps are readable at once and the film leaves a summary
behind. The closing move is not a flourish: the four stops slide together
and become one disc, which is the sentence *four steps, one app* said
without words.

## Colour

Brand only, and used the way the design system allows it:

| | Where |
|---|---|
| **Navy** `#071138` | every background |
| **Cyan** `#00e1ff` | on navy only — the line, the liquid, the particles, "Money" |
| **Brand blue** `#1400ff` | on white only — the icons inside the white station discs |
| **White** `#ffffff` | on navy — type, discs, the head of the moving light |

Cyan on white is 1.59:1 and brand blue on navy is 2.16:1; the site's token
build refuses both, and so do these.

## How they render

**Frames are stepped, not recorded.** Each scene exposes
`window.renderFrame(seconds)` which sets the entire stage for that instant
and keeps no state between calls; `lib/render.mjs` walks it one frame at a
time and screenshots each. No dropped frames, no timing jitter, and the same
bytes every time. Any moment is inspectable: open a scene in a browser and
call `renderFrame(6.2)` to freeze on it.

**Nothing is random.** Every scatter and wobble comes from a seeded
generator (`seeded()` in `lib/scene.js`). `Math.random()` in a film means the
second render is a different film.

**The mark is never redrawn.** `lib/falcon.js` is generated from
`src/assets/brand/falcon.svg`. Film 03 goes further and rasterises that path
to decide where each particle belongs, so the swarm resolves into the real
mark to the pixel. Change the logo on the site, run `npm run motion:assets`,
and all three follow.

## Files

```
motion/
  01-the-journey.html  ┐ one self-contained file per film; every timing is a
  02-pour.html         ├ span(t, from, to) in seconds, in the renderFrame
  03-swarm.html        ┘ function at the bottom
  PRODUCTION.md        shot list + prompts, if these are ever shot live
  lib/
    render.mjs         frame stepper + ffmpeg encode
    scene.js           easing, timing, colour, seeded randomness
    scene.css          shared stage
    falcon.js          GENERATED from the brand SVG
    geo.js             GENERATED from Natural Earth
    make-falcon.mjs  ┐ npm run motion:assets
    make-geo.mjs     ┘
  out/                 the rendered MP4s
```

Retiming is two numbers: change `3.5` to `4.2` and nothing else has to move
with it. `ffmpeg` must be on the PATH. Output is H.264 High, CRF 16,
yuv420p, faststart — it plays in Safari, QuickTime, PowerPoint, Instagram
and LinkedIn without conversion.

## Still outstanding

The end cards set the wordmark in live type, because the **full logo lockup
does not exist as a vector** — only the falcon does, and it was traced from a
239-pixel PNG. That is the one asset that would improve all three (see
`CONTENT-NEEDED.md`).
