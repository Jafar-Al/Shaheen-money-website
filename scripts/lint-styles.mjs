/**
 * Design-system lint (audit T.13: "a token that can be bypassed is
 * documentation, not a system"). Fails on:
 *   · arbitrary Tailwind values  (w-[13px], text-[#123], rounded-[10px] …)
 *   · physical direction utilities (ml-, pr-, left-, text-left …) — use the
 *     logical ones (ms-, pe-, start-, text-start …) so RTL is correct by
 *     construction (audit T.19)
 *   · radius / shadow utilities outside the token set (2px panels, pills,
 *     and one paper shadow under slips)
 *   · signal (cyan) text or fills on paper surfaces (1.4:1) and gradient text
 *   · the retired electric blue (#1400ff) and glass (backdrop blur) anywhere
 *   · tracking utilities (letter-spacing comes from type tokens only)
 *   · em dashes in visitor-facing Arabic copy, where they read as machine text
 *
 *   node scripts/lint-styles.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const exts = new Set(['.astro', '.ts', '.tsx', '.mjs']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (exts.has(full.slice(full.lastIndexOf('.')))) yield full;
  }
}

const rules = [
  {
    id: 'arbitrary-value',
    // utility-[value], but not arbitrary *variants* like [&_a]:underline
    re: /(?<![\w&])(?:[a-z]+:)*-?[a-z][a-z0-9-]*-\[[^\]\s]+\](?!:)/g,
    why: 'Use a design token instead of an arbitrary value.',
  },
  {
    id: 'physical-direction',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*-?(?:ml|mr|pl|pr|left|right|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|border-l|border-r|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[a-z0-9./]+/g,
    why: 'Use logical utilities (ms-/me-/ps-/pe-/start-/end-/rounded-s/border-s …) so Arabic mirrors correctly.',
  },
  {
    id: 'physical-text-align',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*text-(?:left|right)(?![\w-])/g,
    why: 'Use text-start / text-end.',
  },
  {
    id: 'off-token-radius',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*rounded(?:-(?:xs|md|lg|xl|2xl|3xl|4xl))?(?![\w-])/g,
    why: 'Only rounded-sm (2px panels), rounded-full (pills) and rounded-none exist.',
  },
  {
    id: 'off-token-shadow',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*shadow-(?:xs|sm|md|lg|xl|2xl|inner)(?![\w-])/g,
    why: 'The only shadow is shadow-paper, under a Slip. Separate everything else with hairlines.',
  },

  {
    id: 'tracking-utility',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*tracking-[a-z]+/g,
    why: 'Letter-spacing comes from type tokens (and is always 0 for Arabic).',
  },
  {
    id: 'gradient-text',
    re: /bg-clip-text|background-clip:\s*text/g,
    why: 'Gradient text vanishes in forced-colours mode (audit A.4.7).',
  },
];

// Signal (cyan) is only legal on Night; flag it in files that never set a
// night surface. On paper the accent is signal-ink.
const cyan = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|fill|stroke|border|bg)-signal(?![\w-])/;
const darkContext = /t-night|temp="night"|tone="night"|tone === 'night'/;

const problems = [];
for (const dir of ['src']) {
  for await (const file of walk(join(root, dir))) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');

    // Only inspect class-bearing strings in markup and class lists.
    lines.forEach((line, i) => {
      if (!/class(?::list)?=|class:\s|['"`][^'"`]*\b(?:flex|grid|text-|bg-|border|rounded|shadow|p[xy]?-|m[xy]?-)/.test(line)) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const rule of rules) {
        rule.re.lastIndex = 0;
        for (const m of line.matchAll(rule.re)) {
          problems.push({ file: rel, line: i + 1, rule: rule.id, match: m[0], why: rule.why });
        }
      }
    });

    // A line may opt out with a reason, `lint-allow signal-on-paper: why`
    // (the press kit's swatch has to show the colour itself).
    const cyanLines = lines.filter((l) => cyan.test(l) && !/lint-allow signal-on-paper/.test(l));
    if (cyanLines.length > 0 && !darkContext.test(text)) {
      const i = lines.indexOf(cyanLines[0]);
      problems.push({ file: rel, line: i + 1, rule: 'signal-on-paper', match: 'signal', why: 'Signal cyan is for Night only (1.4:1 on paper). Use the accent token or signal-ink.' });
    }

    // The retired brand blue may not come back, in any file, in any form.
    lines.forEach((line, i) => {
      if (/#1400ff|bg-blue|text-blue|--color-blue/i.test(line) && !/retired/i.test(line)) {
        problems.push({ file: rel, line: i + 1, rule: 'retired-blue', match: '#1400ff', why: 'The electric blue is retired (it reads violet beside navy).' });
      }
      if (/backdrop-blur|backdrop-filter/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) {
        problems.push({ file: rel, line: i + 1, rule: 'glass', match: 'backdrop', why: 'No glass: surfaces are opaque and separated by hairlines.' });
      }
    });

    // Arabic copy: no em dashes in visitor-facing strings.
    if (rel.startsWith('src/copy/') || rel.startsWith('src/data/')) {
      lines.forEach((line, i) => {
        if (/[؀-ۿ]/.test(line) && line.includes('—') && !/meta|title: '.*— شاهين موني'/.test(line)) {
          problems.push({ file: rel, line: i + 1, rule: 'arabic-em-dash', match: '—', why: 'Use ، or a full stop in Arabic copy.' });
        }
      });
    }
  }
}

if (problems.length) {
  for (const p of problems) console.log(`${p.file}:${p.line}  ${p.rule}  "${p.match}"  ${p.why}`);
  console.log(`\n${problems.length} design-system violation(s).`);
  process.exit(1);
}
console.log('Design-system lint: clean.');
