#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = join(ROOT, '.env');

function loadEnv() {
  if (!existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = loadEnv();
const V = env.GRAPH_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${V}`;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function api(path, params = {}, method = 'GET') {
  const url = new URL(`${BASE}${path}`);
  let opts;
  if (method === 'POST') {
    opts = { method, body: new URLSearchParams(params) };
  } else {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url, opts);
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.type}: ${json.error.message}`);
  return json;
}

const commands = {
  async exchange() {
    const json = await api('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: arg('app-id'),
      client_secret: arg('app-secret'),
      fb_exchange_token: arg('token'),
    });
    console.log(json.access_token);
  },

  async discover() {
    const token = arg('token') || env.IG_ACCESS_TOKEN;
    const pages = await api('/me/accounts', {
      access_token: token,
      fields: 'id,name,access_token,instagram_business_account{id,username}',
    });
    if (!pages.data?.length) throw new Error('No Facebook Pages found for this token');
    for (const p of pages.data) {
      const ig = p.instagram_business_account;
      console.log(`Page: ${p.name} (${p.id}) -> IG: ${ig ? `@${ig.username} (${ig.id})` : 'NONE'}`);
      if (ig && process.argv.includes('--save')) {
        writeFileSync(
          ENV_PATH,
          `IG_ACCESS_TOKEN=${p.access_token}\nIG_USER_ID=${ig.id}\nIG_USERNAME=${ig.username}\nGRAPH_VERSION=${V}\n`
        );
        console.log(`Saved page token (no expiry) + IG id to ${ENV_PATH}`);
        return;
      }
    }
  },

  async status() {
    const me = await api(`/${env.IG_USER_ID}`, {
      access_token: env.IG_ACCESS_TOKEN,
      fields: 'username,followers_count,media_count',
    });
    console.log(`@${me.username} | followers: ${me.followers_count} | posts: ${me.media_count}`);
  },

  async post() {
    const { IG_ACCESS_TOKEN: token, IG_USER_ID: igId } = env;
    if (!token || !igId) throw new Error('Missing IG_ACCESS_TOKEN/IG_USER_ID in .env — run discover --save first');
    const imageUrl = arg('image-url');
    if (!imageUrl) throw new Error('Missing --image-url (must be a public URL)');
    const captionFile = arg('caption-file');
    const caption = captionFile ? readFileSync(captionFile, 'utf8') : arg('caption') || '';

    const container = await api(`/${igId}/media`, { access_token: token, image_url: imageUrl, caption }, 'POST');
    for (let i = 0; i < 20; i++) {
      const st = await api(`/${container.id}`, { access_token: token, fields: 'status_code' });
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error('Media container processing failed (check image URL is public JPEG/PNG)');
      await new Promise((r) => setTimeout(r, 2000));
    }
    const pub = await api(`/${igId}/media_publish`, { access_token: token, creation_id: container.id }, 'POST');
    const link = await api(`/${pub.id}`, { access_token: token, fields: 'permalink' });
    console.log(link.permalink);
  },
};

const cmd = process.argv[2];
if (!commands[cmd]) {
  console.log('Usage: node ig.mjs <exchange|discover|status|post> [--app-id X --app-secret Y --token T] [--image-url URL --caption "..." | --caption-file path] [--save]');
  process.exit(1);
}
commands[cmd]().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
