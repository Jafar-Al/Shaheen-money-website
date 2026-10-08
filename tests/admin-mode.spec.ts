/**
 * The rules that decide which figures the console shows and whether the
 * demo accounts may sign in (src/server/admin/mode.ts). The promise to the
 * owner: once the Shaheen app's database is connected, the demo is gone,
 * whatever the environment says.
 */
import { expect, test } from '@playwright/test';
import { resolveMode, type ModeInput } from '../src/server/admin/mode';

const base: ModeInput = { connected: false, dev: false, hasAccounts: false };

test.describe('console mode', () => {
  test('a deployment shows the app’s data and only its own staff by default', () => {
    expect(resolveMode(base)).toEqual({ dataSource: 'shaheen', demoAccounts: false });
    expect(resolveMode({ ...base, hasAccounts: true })).toEqual({ dataSource: 'shaheen', demoAccounts: false });
  });

  test('ADMIN_DEMO=true makes a showcase: generated data and the demo accounts', () => {
    expect(resolveMode({ ...base, demo: 'true' })).toEqual({ dataSource: 'demo', demoAccounts: true });
    expect(resolveMode({ ...base, demo: 'true', dataSource: 'shaheen', hasAccounts: true })).toEqual({ dataSource: 'demo', demoAccounts: true });
  });

  test('once connected there is no demo anywhere, whatever the settings', () => {
    for (const dev of [true, false])
      for (const demo of [undefined, 'true', 'false'] as const)
        for (const dataSource of [undefined, 'demo', 'shaheen'] as const)
          for (const hasAccounts of [true, false])
            expect(resolveMode({ connected: true, dev, demo, dataSource, hasAccounts })).toEqual({ dataSource: 'shaheen', demoAccounts: false });
  });

  test('development works with nothing configured, and stops using demo accounts once it has its own', () => {
    expect(resolveMode({ ...base, dev: true })).toEqual({ dataSource: 'demo', demoAccounts: true });
    expect(resolveMode({ ...base, dev: true, hasAccounts: true })).toEqual({ dataSource: 'demo', demoAccounts: false });
    expect(resolveMode({ ...base, dev: true, demo: 'false' })).toEqual({ dataSource: 'demo', demoAccounts: false });
    expect(resolveMode({ ...base, dev: true, dataSource: 'shaheen' })).toEqual({ dataSource: 'shaheen', demoAccounts: true });
  });

  test('ADMIN_DATA_SOURCE=demo alone shows generated data but admits no demo account on a deployment', () => {
    expect(resolveMode({ ...base, dataSource: 'demo', hasAccounts: true })).toEqual({ dataSource: 'demo', demoAccounts: false });
  });
});
