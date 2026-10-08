/**
 * MOCK DATA — app users. Not real people: names are drawn from common
 * first and family names, emails are on example.com (reserved for
 * documentation), and the whole set is regenerated from a fixed seed.
 */
import type { AdminUserDetail, CountryCode } from '../types/admin';
import { DAY, HISTORY_DAYS, NOW, TODAY, HOUR_WEIGHTS, HOUR, iso, stream } from './seed';

const FIRST_M = ['Ahmad', 'Mohammad', 'Omar', 'Khaled', 'Yousef', 'Ali', 'Hasan', 'Ibrahim', 'Mahmoud', 'Tariq', 'Sami', 'Fadi', 'Rami', 'Ziad', 'Karim', 'Nabil', 'Hani', 'Majd', 'Laith', 'Zaid', 'Bashar', 'Amer', 'Saeed', 'Mustafa', 'Adel', 'Anas', 'Hamza', 'Osama', 'Waleed', 'Jad'];
const FIRST_F = ['Layla', 'Rania', 'Sara', 'Noor', 'Hala', 'Dina', 'Lina', 'Reem', 'Maya', 'Yasmin', 'Farah', 'Huda', 'Salma', 'Mariam', 'Aya', 'Rana', 'Hiba', 'Dana', 'Lubna', 'Nadia', 'Ruba', 'Jana', 'Tala', 'Zeina', 'Leen', 'Sana'];
const LAST_LEVANT = ['Haddad', 'Khalil', 'Saleh', 'Nasser', 'Mansour', 'Qasem', 'Hamdan', 'Darwish', 'Khoury', 'Abboud', 'Masri', 'Nimer', 'Shami', 'Tamimi', 'Hijazi', 'Awad', 'Barakat', 'Jaber', 'Hourani', 'Zoubi', 'Odeh', 'Sabbagh', 'Kassab', 'Rifai', 'Najjar', 'Bitar', 'Halabi', 'Yasin', 'Fakhoury', 'Majali'];
const LAST_EGYPT = ['Hassan', 'Mostafa', 'Abdelrahman', 'Fawzi', 'Gamal', 'Shalaby', 'Ezzat', 'Mahmoud', 'Soliman', 'Farouk', 'Ragab', 'Naguib'];
const FIRST_W = ['Daniel', 'Sophie', 'Lukas', 'Emma', 'Hannah', 'Thomas', 'Claire', 'James', 'Olivia', 'Marie', 'Jonas', 'Chloé'];
const LAST_W = ['Becker', 'Martin', 'Wilson', 'Schmidt', 'Dubois', 'Moreau', 'Taylor', 'Brown', 'Fischer', 'Clarke'];

/** Where users live: mostly at home in the Levant and Egypt, the rest abroad where they earn. */
export const USER_COUNTRIES: ReadonlyArray<readonly [CountryCode, number]> = [
  ['JO', 46],
  ['EG', 14],
  ['AE', 10],
  ['LB', 8],
  ['SA', 7],
  ['DE', 3],
  ['GB', 3],
  ['US', 3],
  ['QA', 2],
  ['TR', 2],
  ['CA', 1],
  ['FR', 1],
];

const HOME = new Set(['JO', 'EG', 'LB']);
export const isHome = (c: CountryCode) => HOME.has(c);

const IOS_DEVICES = ['iPhone 16 · iOS 18.6', 'iPhone 15 · iOS 18.6', 'iPhone 15 · iOS 18.5', 'iPhone 14 · iOS 17.7', 'iPhone 13 · iOS 18.6', 'iPhone SE · iOS 17.6'];
const ANDROID_DEVICES = ['Samsung Galaxy A55 · Android 15', 'Samsung Galaxy S24 · Android 15', 'Xiaomi Redmi Note 13 · Android 14', 'Google Pixel 8 · Android 15', 'Oppo A78 · Android 14', 'Samsung Galaxy A15 · Android 14'];
const APP_VERSIONS: ReadonlyArray<readonly [string, number]> = [
  ['2.6.0', 40],
  ['2.5.2', 30],
  ['2.5.0', 15],
  ['2.4.1', 10],
  ['2.3.0', 5],
];

/** A user as the mock world keeps it: the public record plus how they use the app. */
export interface MockUser extends AdminUserDetail {
  /** 0–1: how likely this user is to be the one transacting. */
  propensity: number;
  joinedMs: number;
  /** When an occasional user stopped using the app, if they did. */
  churnMs: number | null;
  /** Every time the user was in the app (opens and transactions), oldest first. Filled in by world.ts. */
  sessions: number[];
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

export function generateUsers(): MockUser[] {
  const r = stream('users');
  const users: MockUser[] = [];
  const emails = new Set<string>();

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const dayStart = TODAY - d * DAY;
    const progress = (HISTORY_DAYS - d) / HISTORY_DAYS;
    const weekday = new Date(dayStart).getDay();
    // Friday is the weekend in Jordan: fewer signups.
    const seasonal = weekday === 5 ? 0.78 : weekday === 6 ? 0.9 : 1;
    const expected = (3 + 52 * progress ** 1.4) * seasonal;
    const count = Math.round(expected * (0.82 + r.next() * 0.36));

    for (let i = 0; i < count; i++) {
      const hour = r.weighted(HOUR_WEIGHTS);
      const joinedMs = dayStart + hour * HOUR + r.int(0, 3599) * 1000;
      if (joinedMs > NOW) continue;

      const country = r.weighted(USER_COUNTRIES);
      const western = !isHome(country) && ['DE', 'GB', 'US', 'CA', 'FR'].includes(country) && r.chance(0.18);
      const female = r.chance(0.46);
      const first = western ? r.pick(FIRST_W) : r.pick(female ? FIRST_F : FIRST_M);
      const last = western ? r.pick(LAST_W) : country === 'EG' ? r.pick(LAST_EGYPT) : r.pick(LAST_LEVANT);
      let email = `${slug(first)}.${slug(last)}@example.com`;
      while (emails.has(email)) email = `${slug(first)}.${slug(last)}${r.int(2, 99)}@example.com`;
      emails.add(email);

      const platform = r.chance(0.38) ? 'ios' : 'android';
      const ageDays = (NOW - joinedMs) / DAY;
      const pending = ageDays < 3 ? r.chance(0.4) : r.chance(0.015);
      const suspended = !pending && r.chance(0.006);
      // Engagement: a quarter of users are regulars; half of the rest drift away after a few weeks.
      const regular = r.chance(0.25);
      const propensity = regular ? 0.6 + r.next() * 0.4 : r.next() * 0.45;
      const churnMs = !regular && r.chance(0.5) ? joinedMs + r.lognormal(35, 0.9) * DAY : null;
      // Signing up is the first session; then app opens, a Poisson process,
      // every ~3 days for regulars and ~2 weeks for the rest.
      const opens: number[] = [joinedMs];
      if (!pending) {
        const meanGap = (regular ? 3 : 16) * DAY;
        for (let t = joinedMs + r.next() * DAY; t < NOW && (churnMs === null || t < churnMs); t += -Math.log(1 - r.next() * 0.999) * meanGap) {
          opens.push(Math.round(t));
        }
      }

      users.push({
        id: r.id('usr', 10),
        name: `${first} ${last}`,
        email,
        country,
        joinedAt: iso(joinedMs),
        joinedMs,
        status: suspended ? 'suspended' : pending ? 'pending' : 'active',
        lastActiveAt: null,
        walletStatus: pending ? 'not_created' : suspended ? 'restricted' : r.chance(0.97) ? 'active' : 'not_created',
        onboarding: pending ? 'in_progress' : 'complete',
        appVersion: r.weighted(APP_VERSIONS),
        platform,
        device: r.pick(platform === 'ios' ? IOS_DEVICES : ANDROID_DEVICES),
        propensity: pending ? 0 : propensity,
        churnMs,
        sessions: opens,
      });
    }
  }
  return users;
}
