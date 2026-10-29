import fs from 'node:fs';
export const BASE = 'https://unabridged.merriam-webster.com';
const cookie = fs.readFileSync(process.env.COOKIE_FILE, 'utf8').trim();
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function get(path, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + path, { headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return { status: 404, text: await r.text() };
      if (r.ok) {
        const text = await r.text();
        if (/inputAccessId|Access Sites/.test(text)) throw new Error('session expired');
        return { status: 200, text };
      }
      if (r.status === 429 || r.status >= 500) await sleep(2000 * (i + 1));
      else throw new Error('HTTP ' + r.status);
    } catch (e) { if (e.message === 'session expired' || i === tries - 1) throw e; await sleep(1500 * (i + 1)); }
  }
}
export async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } }));
}
