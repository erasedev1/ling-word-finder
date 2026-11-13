// Phase 3: fetch definition text for every noun headword -> data/defs.jsonl (resumable). Used to tag collective nouns.
import fs from 'node:fs';
import { get, pool } from './common.mjs';
const out = 'data/defs.jsonl';
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).w) : []);
const words = JSON.parse(fs.readFileSync('site/data/words.json', 'utf8')).rows.filter(r => r[1] & 1 && !r[4]).map(r => r[0]).filter(w => !done.has(w));
console.log('todo', words.length);
const fd = fs.openSync(out, 'a');
const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
let n = 0;
await pool(words, 12, async w => {
  const r = await get('/unabridged/' + encodeURIComponent(w));
  let d = '';
  if (r.status === 200) {
    const left = (r.text.match(/id="left-content"[\s\S]*/) || [''])[0];
    d = strip(left.split(/Origin of|Cite this Entry/)[0]).slice(0, 2500);
  }
  fs.writeSync(fd, JSON.stringify({ w, d }) + '\n');
  if (++n % 5000 === 0) console.log(n, new Date().toISOString());
});
console.log('done', n);
