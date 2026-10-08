/**
 * DEMO ONLY: test the screens' other states without a backend. Chosen on
 * Account → Test a state (visible only when ADMIN_DATA_SOURCE=demo), kept
 * in a cookie the demo source reads on the server. The real Shaheen source
 * ignores it.
 *
 *   normal    realistic data
 *   slow      three-second answers: the loading states
 *   empty     no records: every empty state
 *   error     every data request fails: every error state and its retry
 *   degraded  a live incident on one service
 */
export type Scenario = 'normal' | 'slow' | 'empty' | 'error' | 'degraded';

export const SCENARIOS: ReadonlyArray<{ id: Scenario; label: string; hint: string }> = [
  { id: 'normal', label: 'Normal', hint: 'Realistic data and response times.' },
  { id: 'slow', label: 'Slow network', hint: 'Every answer takes about three seconds.' },
  { id: 'empty', label: 'No data yet', hint: 'Every list and chart is empty.' },
  { id: 'error', label: 'Service errors', hint: 'Every data request fails, so each retry can be tried.' },
  { id: 'degraded', label: 'Live incident', hint: 'Push notifications are degraded right now.' },
];

/** The cookie the Account page sets and the demo source reads. */
export const SCENARIO_COOKIE = 'ops_scenario';

export const isScenario = (v: unknown): v is Scenario => SCENARIOS.some((s) => s.id === v);
