#!/usr/bin/env node
// council: send one brief to several models at once through OpenRouter and save their answers.
// Node 18+, no dependencies. Key: environment variable OPENROUTER_API_KEY.
//
//   node council.mjs ask    --brief <file.md> --out <dir> [--models gemini,gpt,perplexity] [--fast]
//   node council.mjs debate --out <dir>      (round 2: each member reads the others and critiques them)
//   node council.mjs models                  (show the line-up, prices and availability)
//   node council.mjs credit                  (spend on this key)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// The line-up. Models age fast: when `models` shows UNAVAILABLE, change the id here.
// Browse current ids at https://openrouter.ai/models
const MODELS = {
  gemini:     { id: 'google/gemini-4-neon',              name: 'Gemini 4 Neon (Google)' },
  gpt:        { id: 'openai/gpt-6.2-sol',                name: 'GPT-6.2 Sol (OpenAI)' },
  perplexity: { id: 'perplexity/sonar-reasoning-pro',    name: 'Perplexity Sonar Reasoning Pro (web + sources)' },
  grok:       { id: 'x-ai/grok-4.7',                     name: 'Grok 4.7 (xAI)' },
  deepseek:   { id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek V4.1 Flash' },
};
const FAST = {
  gemini:     'google/gemini-4-hydrogen',
  gpt:        'openai/gpt-6.1-terra',
  perplexity: 'perplexity/sonar',
};
const DEFAULT = ['gemini', 'gpt', 'perplexity'];

const SYSTEM = `You are an independent expert consultant on a council of several AI models. The other members answer separately and you cannot see their answers.
Your value is in what the others miss. So:
- Look for errors, weak points, missing controls, alternative explanations and hidden assumptions. Disagreement is fine; polite agreement is not.
- Separate what you know for certain, what is likely and what is a guess. State your confidence on every important claim.
- Never invent citations, numbers or sources. If you do not know something or it needs checking, say so.
- If the brief lacks important information, name it and say how it would change the answer.
- Answer in the language of the brief, plainly and in a clear structure, about 700 words at most.`;

const SYSTEM_DEBATE = `You are a member of a council of AI models, in round two. You get the original brief, your own round-one answer and the other members' answers.
- Say where the others are right and you missed it. Change your view if they convinced you, and say why.
- Name specific errors or unsupported claims in the others' answers.
- Finish with: 3 points the council agrees on, and 1 to 3 points still in dispute that need checking (and how).
- Answer in the language of the brief, about 500 words at most.`;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes(`--${name}`);

function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  // Windows: setx only reaches new processes, so read the user environment directly.
  if (process.platform === 'win32') {
    try {
      const v = execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "[Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY','User')"], { encoding: 'utf8' }).trim();
      if (v) return v;
    } catch {}
  }
  console.error('council: OPENROUTER_API_KEY is not set. Get a key at https://openrouter.ai/keys, then:\n' +
    '  Windows:     setx OPENROUTER_API_KEY "sk-or-..."\n' +
    '  macOS/Linux: export OPENROUTER_API_KEY="sk-or-..."   (add it to your shell profile)');
  process.exit(2);
}

const SECRETS = [
  [/\bsk-or-v1-[A-Za-z0-9]{20,}/, 'OpenRouter key'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic key'],
  [/\bsk-(?:proj-|live_|test_)?[A-Za-z0-9_-]{24,}/, 'API key (sk-...)'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS key'],
  [/\bAIza[0-9A-Za-z_-]{30,}|\bAQ\.[A-Za-z0-9_-]{30,}/, 'Google key'],
  [/\bEAA[A-Za-z0-9]{30,}/, 'Meta token'],
  [/\bre_[A-Za-z0-9]{20,}/, 'Resend key'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
  [/\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/i, 'database URL with password'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{20,}/, 'Bearer token'],
  [/\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^\s"']{6,}/i, 'password or key in text'],
];
const PERSONAL = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'email'],
  [/\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3}[\s-]?\d{3,4}\b/, 'phone number'],
  [/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/, 'IBAN', (m) => ibanValid(m)],
];

function ibanValid(s) {
  const t = s.replace(/\s/g, '');
  const r = (t.slice(4) + t.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let z = 0;
  for (const ch of r) z = (z * 10 + Number(ch)) % 97;
  return z === 1;
}

function scan(text, patterns) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const [re, what, check] of patterns) {
      for (const m of line.matchAll(new RegExp(re.source, re.flags + 'g'))) {
        if (check && !check(m[0])) continue;
        hits.push(`line ${i + 1}: ${what} (${m[0].slice(0, 4)}...)`);
      }
    }
  });
  return hits;
}

// Everything sent out passes here first. Secrets can never be overridden; personal data only with --allow-personal.
function guard(messages) {
  const secrets = []; const personal = [];
  for (const m of messages) {
    const where = m.role === 'system' ? 'instructions' : 'brief';
    secrets.push(...scan(m.content, SECRETS).map((h) => `${where}, ${h}`));
    if (!flag('allow-personal')) personal.push(...scan(m.content, PERSONAL).map((h) => `${where}, ${h}`));
  }
  if (!secrets.length && !personal.length) return null;
  let s = 'council: STOPPED, nothing was sent.\n';
  if (secrets.length) s += 'Secrets (never send these, remove them from the brief):\n  ' + [...new Set(secrets)].join('\n  ') + '\n';
  if (personal.length) s += 'Personal data (remove it, or if it is the user\'s own and truly needed, add --allow-personal):\n  ' + [...new Set(personal)].join('\n  ') + '\n';
  return s;
}

async function call(model, messages, key) {
  const blocked = guard(messages);
  if (blocked) throw new Error(blocked);
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'council-skill' },
    body: JSON.stringify({ model, messages, usage: { include: true } }),
    signal: AbortSignal.timeout(300_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  const msg = json.choices?.[0]?.message || {};
  let text = (msg.content || '').trim();
  const sources = json.citations || msg.annotations?.filter((a) => a.type === 'url_citation').map((a) => a.url_citation?.url) || [];
  if (sources.length) text += '\n\n**Sources:**\n' + [...new Set(sources)].map((u, i) => `[${i + 1}] ${u}`).join('\n');
  return { text, cost: json.usage?.cost ?? null, seconds: Math.round((Date.now() - t0) / 1000), model: json.model || model };
}

function lineUp() {
  const picked = (arg('models') || DEFAULT.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  for (const p of picked) if (!MODELS[p]) { console.error(`council: unknown model "${p}" (available: ${Object.keys(MODELS).join(', ')})`); process.exit(2); }
  return picked.map((p) => ({ key: p, name: MODELS[p].name, id: flag('fast') && FAST[p] ? FAST[p] : MODELS[p].id }));
}

async function run(members, messagesFor, out, suffix) {
  for (const m of members) {
    const blocked = guard(messagesFor(m));
    if (blocked) { console.error(blocked); process.exit(3); }
  }
  const key = apiKey();
  const results = await Promise.allSettled(members.map((m) => call(m.id, messagesFor(m), key)));
  let total = 0;
  results.forEach((r, i) => {
    const m = members[i];
    const file = join(out, `${m.key}${suffix}.md`);
    if (r.status === 'fulfilled') {
      writeFileSync(file, `# ${m.name}\n_model: ${r.value.model}_\n\n${r.value.text}\n`, 'utf8');
      if (r.value.cost) total += r.value.cost;
      console.log(`OK     ${m.key.padEnd(11)} ${String(r.value.seconds).padStart(4)} s  ${r.value.cost != null ? '$' + r.value.cost.toFixed(4) : ''}  -> ${file}`);
    } else {
      console.log(`FAILED ${m.key.padEnd(11)} ${r.reason.message}`);
    }
  });
  console.log(`total: $${total.toFixed(4)}`);
  if (results.every((r) => r.status === 'rejected')) process.exit(1);
}

const commands = {
  async ask() {
    const brief = arg('brief'); const out = arg('out');
    if (!brief || !out) { console.error('usage: ask --brief <file.md> --out <dir>'); process.exit(2); }
    const text = readFileSync(brief, 'utf8');
    mkdirSync(out, { recursive: true });
    const members = lineUp();
    writeFileSync(join(out, 'lineup.json'), JSON.stringify({ members, brief }, null, 2), 'utf8');
    await run(members, () => [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }], out, '');
  },

  async debate() {
    const out = arg('out');
    if (!out || !existsSync(join(out, 'lineup.json'))) { console.error('usage: debate --out <dir from ask>'); process.exit(2); }
    const { members, brief } = JSON.parse(readFileSync(join(out, 'lineup.json'), 'utf8'));
    const text = readFileSync(brief, 'utf8');
    const answers = Object.fromEntries(
      readdirSync(out)
        .filter((f) => f.endsWith('.md') && !f.includes('-round2') && f !== 'brief.md' && !f.startsWith('synthesis'))
        .map((f) => [f.replace(/\.md$/, ''), readFileSync(join(out, f), 'utf8')]));
    const active = members.filter((m) => answers[m.key]);
    await run(active, (m) => {
      const others = Object.entries(answers).filter(([k]) => k !== m.key)
        .map(([k, t]) => `--- ANSWER: ${k} ---\n${t}`).join('\n\n');
      return [
        { role: 'system', content: SYSTEM_DEBATE },
        { role: 'user', content: `ORIGINAL BRIEF:\n${text}\n\nYOUR ROUND-ONE ANSWER:\n${answers[m.key]}\n\nTHE OTHERS' ANSWERS:\n${others}` },
      ];
    }, out, '-round2');
  },

  async models() {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const all = Object.fromEntries((await res.json()).data.map((m) => [m.id, m]));
    for (const [k, m] of Object.entries(MODELS)) {
      for (const id of [m.id, FAST[k]].filter(Boolean)) {
        const x = all[id];
        const p = x ? `in $${(x.pricing.prompt * 1e6).toFixed(2)} / out $${(x.pricing.completion * 1e6).toFixed(2)} per 1M tokens` : 'UNAVAILABLE: change the id in council.mjs';
        console.log(`${DEFAULT.includes(k) ? '*' : ' '} ${k.padEnd(11)} ${id.padEnd(36)} ${p}${id === FAST[k] ? '  (--fast)' : ''}`);
      }
    }
    console.log('* = default line-up');
  },

  async credit() {
    const r = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${apiKey()}` } });
    const d = (await r.json()).data || {};
    console.log(`spent on this key: $${(d.usage ?? 0).toFixed(4)}${d.limit != null ? ` of a $${d.limit} limit` : ' (no limit set)'}`);
  },
};

const cmd = process.argv[2];
if (!commands[cmd]) {
  console.log('usage: node council.mjs <ask|debate|models|credit> ...');
  process.exit(1);
}
commands[cmd]().catch((e) => { console.error('council: ' + e.message); process.exit(1); });
