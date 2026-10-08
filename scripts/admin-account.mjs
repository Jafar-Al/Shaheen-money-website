/**
 * Staff accounts for the operations console, made on your own machine.
 *
 *   npm run admin:add -- --email you@shaheen.money --name "Your Name" --role ADMIN
 *   npm run admin:add -- --email … --name … --role SUPPORT --generate   (a strong random password, shown once)
 *   npm run admin:list
 *   npm run admin:remove -- --email someone@shaheen.money
 *   npm run admin:secret                                                (a new ADMIN_SESSION_SECRET)
 *
 * The password is typed here (hidden) and only its scrypt hash is kept. A
 * second factor is set up by default: add the key it prints to an
 * authenticator app (Google Authenticator, Microsoft Authenticator, 1Password
 * …) and type the code it shows to confirm. --no-mfa skips it, and such an
 * account cannot sign in on production unless ADMIN_REQUIRE_MFA=false.
 *
 * Writes ADMIN_ACCOUNTS (and ADMIN_SESSION_SECRET, if missing) into .env for
 * local use, then prints what to paste into Vercel → Settings →
 * Environment Variables. Nothing is sent anywhere.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { hashPassword, newTotpSecret, otpauthUri, randomId, verifyTotp } from '../src/server/admin/crypto.ts';

const ROLES = ['ADMIN', 'OPERATIONS', 'COMPLIANCE', 'SUPPORT'];
// ADMIN_ENV_FILE points elsewhere (tests, or a second checkout); .env by default.
const ENV = process.env.ADMIN_ENV_FILE ?? new URL('../.env', import.meta.url);
const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : undefined;
};

function readEnv() {
  return existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
}
function getVar(text, name) {
  const m = text.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!m) return '';
  return m[1].trim().replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
}
function setVar(text, name, value) {
  const line = `${name}='${value}'`;
  const re = new RegExp(`^${name}=.*$`, 'm');
  return re.test(text) ? text.replace(re, () => line) : `${text.replace(/\n*$/, '\n')}${line}\n`;
}
function accounts(text) {
  const raw = getVar(text, 'ADMIN_ACCOUNTS');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    console.error('ADMIN_ACCOUNTS in .env is not valid JSON. Fix or remove that line first.');
    process.exit(1);
  }
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (s === '\r\n' || s === '\n') rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function printVercel(text) {
  console.log('\nFor Vercel → Settings → Environment Variables (Production), set these two, then redeploy:\n');
  console.log(`ADMIN_ACCOUNTS\n${getVar(text, 'ADMIN_ACCOUNTS')}\n`);
  console.log(`ADMIN_SESSION_SECRET\n${getVar(text, 'ADMIN_SESSION_SECRET')}\n`);
  console.log('Both are secrets: paste them only into Vercel, never into a chat, an email or the repository.');
}

if (command === 'secret') {
  console.log(randomBytes(48).toString('base64url'));
  process.exit(0);
}

if (command === 'list') {
  const list = accounts(readEnv());
  if (!list.length) console.log('No accounts in .env yet. Add one with: npm run admin:add -- --email … --name … --role ADMIN');
  for (const a of list) console.log(`${a.role.padEnd(11)} ${a.email.padEnd(36)} ${a.name}${a.totpSecret ? '' : '  (no second factor)'}${a.disabled ? '  (disabled)' : ''}`);
  process.exit(0);
}

if (command === 'remove') {
  const email = String(flag('email') ?? '').toLowerCase();
  let text = readEnv();
  const list = accounts(text);
  const next = list.filter((a) => a.email !== email);
  if (next.length === list.length) {
    console.error(`No account with the email ${email}.`);
    process.exit(1);
  }
  text = setVar(text, 'ADMIN_ACCOUNTS', JSON.stringify(next));
  writeFileSync(ENV, text);
  console.log(`Removed ${email}. Their sessions stop working on their next request once the new value is deployed.`);
  printVercel(text);
  process.exit(0);
}

if (command !== 'add') {
  console.log('Usage: npm run admin:add -- --email you@shaheen.money --name "Your Name" --role ADMIN [--generate] [--no-mfa]');
  process.exit(1);
}

const email = String(flag('email') ?? '').trim().toLowerCase();
const name = String(flag('name') ?? '').trim();
const role = String(flag('role') ?? 'ADMIN').toUpperCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !ROLES.includes(role)) {
  console.error(`Give --email, --name and --role (one of ${ROLES.join(', ')}).`);
  process.exit(1);
}

let password;
if (flag('generate')) {
  password = randomBytes(18).toString('base64url');
  console.log(`\nPassword for ${email} (shown once, store it in a password manager now):\n\n  ${password}\n`);
} else {
  password = await ask(`Password for ${email} (at least 12 characters, hidden): `, { hidden: true });
  const again = await ask('Type it again: ', { hidden: true });
  if (password !== again) {
    console.error('The two passwords differ. Nothing was saved.');
    process.exit(1);
  }
}
if (password.length < 12) {
  console.error('Use at least 12 characters. Nothing was saved.');
  process.exit(1);
}

let totpSecret;
if (!flag('no-mfa')) {
  totpSecret = newTotpSecret();
  console.log('\nSecond factor: in your authenticator app, add an account by "setup key" (or "enter a code manually"):');
  console.log(`\n  Account:   Shaheen Operations (${email})\n  Key:       ${totpSecret.match(/.{1,4}/g).join(' ')}\n  Type:      time-based, 6 digits\n`);
  console.log(`(Or, if your app takes a link: ${otpauthUri(totpSecret, email)})\n`);
  for (let tries = 0; ; tries++) {
    const code = await ask('Type the 6-digit code the app shows now, to confirm: ');
    if (verifyTotp(totpSecret, code) !== null) break;
    if (tries >= 2) {
      console.error('Those codes did not match. Check the key and the phone clock, then run this again. Nothing was saved.');
      process.exit(1);
    }
    console.log('That code did not match; try the next one.');
  }
  console.log('Second factor confirmed.');
}

let text = readEnv();
const list = accounts(text).filter((a) => a.email !== email);
list.push({ id: `adm_${randomId(6)}`, name, email, role, passwordHash: await hashPassword(password), ...(totpSecret ? { totpSecret } : {}) });
text = setVar(text, 'ADMIN_ACCOUNTS', JSON.stringify(list));
if (getVar(text, 'ADMIN_SESSION_SECRET').length < 32) text = setVar(text, 'ADMIN_SESSION_SECRET', randomBytes(48).toString('base64url'));
writeFileSync(ENV, text);

console.log(`\nSaved ${role} ${email} to .env (local only; .env is never committed).`);
printVercel(text);
