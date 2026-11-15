// Phase 4: re-fetch each entry page and record usage labels per sense (obsolete / slang / vulgar) and whether the headword is capitalized.
// -> data/labels.jsonl (resumable). The earlier entries.mjs read single-quoted class='sl' spans as empty, so labels were lost.
import fs from 'node:fs';
import { get, pool } from './common.mjs';
const out = 'data/labels.jsonl';
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).w) : []);
const only = process.argv.slice(2);
const words = only.length ? only : fs.readFileSync('data/candidates.txt', 'utf8').split('\n').filter(Boolean);
const todo = words.filter(w => !done.has(w) || only.length);
const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#039;/g, "'").replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const sls = html => [...html.matchAll(/<span class=['"]sl['"]>([\s\S]*?)<\/span>/g)].map(m => strip(m[1]).toLowerCase());
export function parse(text) {
  const left = (text.match(/id="left-content"[\s\S]*/) || [''])[0].split(/Origin of|Cite this Entry/)[0];
  const hw = strip((left.match(/<h1 class="hword"[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]).replace(/^\d+\s*/, '');
  const fl = strip((left.match(/<span class="fl"[^>]*>([\s\S]*?)<\/span>/) || [, ''])[1]).toLowerCase();
  let n = 0, obs = 0, slang = 0, vulg = 0;
  for (const vg of left.split('<div class="vg">').slice(1)) {
    const parts = vg.split(/<div class="sense\b/); const head = parts[0].match(/<div class="sls">([\s\S]*?)<\/div>/);
    const base = head ? sls(head[1]) : [];
    for (const s of parts.slice(1)) {
      const labs = [...base, ...sls(s.split(/<span class="dt/)[0])]; n++;
      if (labs.some(l => /\bobsolete\b/.test(l))) obs++;
      if (labs.some(l => /\bslang\b/.test(l))) slang++;
      if (labs.some(l => /\bvulgar\b|\bobscene\b/.test(l))) vulg++;
    }
  }
  return { hw, cap: /^[A-Z]/.test(hw), fl, n, obs, slang, vulg };
}
if (process.argv[1].endsWith('labels.mjs')) {
  const fd = only.length ? null : fs.openSync(out, 'a'); let n = 0;
  await pool(todo, 12, async w => {
    const r = await get('/unabridged/' + encodeURIComponent(w));
    const rec = r.status === 200 ? { w, ...parse(r.text) } : { w, missing: true };
    if (fd) fs.writeSync(fd, JSON.stringify(rec) + '\n'); else console.log(JSON.stringify(rec));
    if (fd && ++n % 5000 === 0) console.log(n, new Date().toISOString());
  });
  console.log('done', todo.length);
}
