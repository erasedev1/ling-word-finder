// Phase 1: walk the Unabridged alphabetical index and keep candidate headwords (a-z only, 4-10 letters).
import fs from 'node:fs';
import { get, pool } from './common.mjs';
const out = 'data/candidates.txt';
const words = new Set(); let total = 0;
const decode = s => s.replace(/&#x27;|&#039;/g, "'").replace(/&amp;/g, '&');
function parse(html) {
  const m = html.match(/<(?:ul|ol)[^>]*class="[^"]*(?:browse|list)[^"]*"[\s\S]*?<\/(?:ul|ol)>/);
  return [...html.matchAll(/href="\/unabridged\/([^"#?]+)"[^>]*>([^<]*)</g)].map(x => decode(x[2]).trim());
}
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const jobs = [];
for (const l of letters) {
  const r = await get(`/browse/unabridged/${l}`);
  const n = Math.max(1, ...[...r.text.matchAll(new RegExp(`/browse/unabridged/${l}/(\\d+)`, 'g'))].map(x => +x[1]));
  console.log(l, 'pages', n);
  for (let p = 1; p <= n; p++) jobs.push([l, p]);
}
await pool(jobs, 8, async ([l, p]) => {
  const r = await get(`/browse/unabridged/${l}${p > 1 ? '/' + p : ''}`);
  for (const w of parse(r.text)) { total++; if (/^[a-z]{4,10}$/.test(w)) words.add(w); }
});
fs.writeFileSync(out, [...words].sort().join('\n') + '\n');
console.log('index entries seen', total, 'candidates', words.size);
