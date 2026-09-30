/**
 * Design-system lint (audit T.13: "a token that can be bypassed is
 * documentation, not a system"). Fails on:
 *   · arbitrary Tailwind values  (w-[13px], text-[#123], rounded-[10px] …)
 *   · physical direction utilities (ml-, pr-, left-, text-left …) — use the
 *     logical ones (ms-, pe-, start-, text-start …) so RTL is correct by
 *     construction (audit T.19)
 *   · radius / shadow utilities outside the token set
 *   · cyan text or fills on light surfaces (1.59:1) and gradient text
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
    re: /(?<![\w-])(?:[a-z0-9-]+:)*rounded(?:-(?:none|xs|xl|2xl|3xl|4xl))?(?![\w-])/g,
    why: 'Only rounded-sm, rounded-md, rounded-lg and rounded-full exist (audit T.12).',
  },
  {
    id: 'off-token-shadow',
    re: /(?<![\w-])(?:[a-z0-9-]+:)*shadow-(?:xs|xl|2xl|inner)(?![\w-])/g,
    why: 'Only shadow-sm, shadow-md and shadow-lg exist.',
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

// Cyan is only legal inside dark surfaces; flag cyan text/fill in files that
// never set a dark surface.
const cyan = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|fill|stroke|border)-cyan(?![\w-])/;
const darkContext = /data-surface=["{]|tone="dark"|tone="navy"|bg-navy|hero-surface|tone === 'dark'|dark \?/;

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

    if (cyan.test(text) && !darkContext.test(text)) {
      const i = lines.findIndex((l) => cyan.test(l));
      problems.push({ file: rel, line: i + 1, rule: 'cyan-on-light', match: 'cyan', why: 'Cyan is for dark surfaces only (1.59:1 on white).' });
    }

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
