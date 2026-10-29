// Phase 2: look up each candidate; record exact-match headwords with part of speech and usage flags.
import fs from 'node:fs';
import { get, pool } from './common.mjs';
const out = 'data/entries.jsonl';
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).w) : []);
const todo = fs.readFileSync('data/candidates.txt', 'utf8').split('\n').filter(w => w && !done.has(w));
console.log('todo', todo.length);
const fd = fs.openSync(out, 'a');
const strip = s => s.replace(/<[^>]*>/g, '').replace(/&#x27;|&#039;/g, "'").replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ').replace(/·/g, '').replace(/\s+/g, ' ').trim();
const _FLAGS = ['obsolete', 'archaic', 'slang', 'vulgar', 'dialectal', 'chiefly dialect', 'foreign', 'variant of', 'abbreviation', 'trademark'];
let n = 0;
await pool(todo, 12, async w => {
  const r = await get('/unabridged/' + encodeURIComponent(w));
  let rec = { w, found: false };
  if (r.status === 200) {
    const ol = r.text.match(/<ol>([\s\S]*?)<\/ol>/);
    const items = ol ? [...ol[1].matchAll(/<a class="standard-search-link"[^>]*>([\s\S]*?)<\/a>/g)].map(m => {
      const t = m[1]; const hw = strip((t.match(/<b>([\s\S]*?)<\/b>/) || [, ''])[1]);
      const pos = (strip(t.replace(/<b>[\s\S]*?<\/b>/, '')).match(/\(([^)]*)\)/) || [, ''])[1];
      return { hw, pos };
    }) : [];
    const left = (r.text.match(/id="left-content"[\s\S]*/) || [r.text])[0];
    const grab = cls => [...new Set([...left.matchAll(new RegExp('<(?:span|b|i)[^>]*class="' + cls + '"[^>]*>([\\s\\S]*?)</(?:span|b|i)>', 'g'))].map(m => strip(m[1]).toLowerCase()).filter(Boolean))];
    const first = { hw: strip((left.match(/<h1 class="hword">([\s\S]*?)<\/h1>/) || [, ''])[1]), fl: grab('fl'), vd: grab('vd'), if: grab('if'), sl: grab('sl') };
    const flags = [];
    const exact = items.filter(i => i.hw === w);
    rec = { w, found: items.length > 0, exact: exact.map(i => i.pos), base: exact.length ? undefined : [...new Set(items.map(i => i.hw + '|' + i.pos))], flags, first };
  }
  fs.writeSync(fd, JSON.stringify(rec) + '\n');
  if (++n % 5000 === 0) console.log(n, new Date().toISOString());
});
console.log('done', n);
