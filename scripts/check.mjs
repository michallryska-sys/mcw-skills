#!/usr/bin/env node
// Checks every skills/*/SKILL.md and scans the repo for secrets. Node 18+, no dependencies.
//   node scripts/check.mjs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const errors = [];
const fail = (msg) => errors.push(msg);

// 1. Every skill has a valid SKILL.md
const skillsDir = join(root, 'skills');
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
for (const s of skills) {
  const file = join(skillsDir, s, 'SKILL.md');
  if (!existsSync(file)) { fail(`skills/${s}: missing SKILL.md`); continue; }
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) { fail(`skills/${s}/SKILL.md: no frontmatter`); continue; }
  const fm = m[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1].trim();
  if (name !== s) fail(`skills/${s}/SKILL.md: name is "${name}", expected "${s}"`);
  if (!/^[a-z0-9-]{1,64}$/.test(name || '')) fail(`skills/${s}/SKILL.md: name must be lowercase letters, digits and hyphens`);
  const desc = fm.match(/^description:\s*(?:>-?|\|)?\s*\r?\n?([\s\S]*?)(?=^\S|$(?![\s\S]))/m)?.[1].replace(/\s+/g, ' ').trim();
  if (!desc) fail(`skills/${s}/SKILL.md: missing description`);
  else if (desc.length > 1024) fail(`skills/${s}/SKILL.md: description is ${desc.length} chars (max 1024)`);
  if (!/^license:/m.test(fm)) fail(`skills/${s}/SKILL.md: missing license`);
}

// 2. JSON manifests parse
for (const f of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
  try { JSON.parse(readFileSync(join(root, f), 'utf8')); } catch (e) { fail(`${f}: ${e.message}`); }
}

// 3. No secrets or private files in what git tracks
let tracked = [];
try { tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); }
catch { fail('git ls-files failed: run this inside the repo'); }
const SECRET = [
  [/\bEAA[A-Za-z0-9]{30,}/, 'Meta access token'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bsk-(ant-)?[A-Za-z0-9_-]{30,}/, 'API key'],
  [/\bsk_(live|test)_[A-Za-z0-9]{20,}/, 'Stripe key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/^[ \t]*[A-Z_]*(TOKEN|SECRET|PASSWORD|API_KEY)[ \t]*=[ \t]*\S{8,}/m, 'filled-in secret variable'],
];
for (const f of tracked) {
  if (/(^|\/)\.env$/.test(f)) { fail(`${f}: .env must never be committed`); continue; }
  const text = readFileSync(join(root, f), 'utf8');
  for (const [re, what] of SECRET) if (re.test(text)) fail(`${f}: looks like a ${what}`);
}

if (errors.length) {
  console.error(`check failed (${errors.length}):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`check passed: ${skills.length} skills (${skills.join(', ')}), manifests OK, no secrets in ${tracked.length} tracked files`);
