import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Lists every unresolved content item as build warnings, so a missing fact
 * is never silent: production pages simply leave its section out, and this
 * is where the omission is reported. The list comes from
 * scripts/check-launch.ts (the same report `npm run check:launch` prints and
 * CI enforces on main); here it warns and never fails the build.
 */
export default function contentGaps() {
  return {
    name: 'shaheen:content-gaps',
    hooks: {
      'astro:build:done': ({ logger }) =>
        new Promise((resolve) => {
          const script = fileURLToPath(new URL('../scripts/check-launch.ts', import.meta.url));
          execFile(process.execPath, [script], { env: process.env }, (_error, stdout) => {
            const lines = String(stdout).split('\n').filter((l) => l.trim());
            if (lines.length) {
              logger.warn('Content still needed before launch (npm run check:launch):');
              for (const line of lines) logger.warn(line);
            }
            resolve(undefined);
          });
        }),
    },
  };
}
