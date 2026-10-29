// Phase 3: turn data/entries.jsonl into site/data/words.json (compact rows for the browser).
import fs from 'node:fs';
const POS = ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'];
// bits in `pos`; bit 8-9 = verb transitivity (8 transitive, 9 intransitive)
const FORM = { base: 0, plural: 1, third: 2, past: 3, prp: 4, comp: 5, sup: 6, irr: 7 };
const FLAG = { obsolete: 1, archaic: 2, slang: 4, vulgar: 8, dialect: 16, abbr: 32 };
const PRONOUNS = {
  personal: 'myself yourself himself herself itself ourselves yourselves themselves them they their theirs your yours hers ours mine thee thou thine ye'.split(' '),
  indefinite: 'anyone anybody anything everyone everybody everything someone somebody something nobody nothing another other others some many both each either neither none several most more such same all one ones'.split(' '),
  interrogative: 'what which who whom whose whoever whatever whichever whomever'.split(' '),
  relative: 'that which whom whose whoever whatever whichever whomever what'.split(' '),
  demonstrative: 'this that these those such'.split(' '),
  plural: 'them they their theirs ourselves yourselves themselves these those both many several others ours ones'.split(' '),
  singular: 'myself yourself himself herself itself anyone anybody anything everyone everybody everything someone somebody something nobody nothing another each either neither this that mine hers'.split(' '),
  possessive: 'their theirs your yours hers ours mine whose'.split(' '),
  nominative: 'they who whoever thou ye'.split(' '),
  objective: 'them whom whomever thee'.split(' '),
};
const pn = {};
for (const [k, ws] of Object.entries(PRONOUNS)) for (const w of ws) if (/^[a-z]{4,10}$/.test(w)) (pn[w] ||= []).push(k);

const mapPos = p => {
  p = p.toLowerCase();
  if (/abbrev|prefix|suffix|combining|symbol|trademark|geographical|biographical|contraction/.test(p)) return { abbr: true };
  const r = { bits: 0 };
  if (/\bnoun\b/.test(p)) r.bits |= 1;
  if (/pronoun/.test(p)) r.bits |= 2;
  if (/\bverb|verbal auxiliary/.test(p)) { r.bits |= 4; if (/intransitive/.test(p)) r.bits |= 512; else if (/transitive/.test(p)) r.bits |= 256; }
  if (/adjective/.test(p)) r.bits |= 8;
  if (/adverb/.test(p)) r.bits |= 16;
  if (/preposition/.test(p)) r.bits |= 32;
  if (/conjunction/.test(p)) r.bits |= 64;
  if (/interjection/.test(p)) r.bits |= 128;
  return r;
};
const regular = (stem, f) => {
  const forms = new Set([stem + 's', stem + 'es', stem + 'ed', stem + 'd', stem + 'ing', stem + 'er', stem + 'est', stem + 'r', stem + 'st']);
  const y = stem.endsWith('y') ? stem.slice(0, -1) : null;
  if (y) for (const x of ['ies', 'ied', 'ier', 'iest']) forms.add(y + x);
  if (stem.endsWith('e')) forms.add(stem.slice(0, -1) + 'ing');
  forms.add(stem + stem.at(-1) + 'ed'); forms.add(stem + stem.at(-1) + 'ing'); forms.add(stem + stem.at(-1) + 'er'); forms.add(stem + stem.at(-1) + 'est');
  return forms.has(f);
};

const rows = [];
const lines = fs.readFileSync('data/entries.jsonl', 'utf8').split('\n').filter(Boolean);
let skipped = 0;
for (const line of lines) {
  const e = JSON.parse(line);
  if (!e.found) { skipped++; continue; }
  const f = e.first || {};
  let pos = 0, abbr = false, form = 0, base = '';
  const exact = e.exact || [];
  const labels = (f.sl || []).join(' | ');
  let flags = 0;
  if (/obsolete/.test(labels)) flags |= FLAG.obsolete;
  if (/archaic/.test(labels)) flags |= FLAG.archaic;
  if (/slang/.test(labels)) flags |= FLAG.slang;
  if (/vulgar|obscene/.test(labels)) flags |= FLAG.vulgar;
  if (/dialect/.test(labels)) flags |= FLAG.dialect;
  if (exact.length) {
    for (const p of exact) { const m = mapPos(p); if (m.abbr) abbr = true; else pos |= m.bits; }
    if (pos === 0 && !abbr) pos = 0;
    // verb transitivity from the displayed entry when the list only says "verb"
    if (pos & 4 && !(pos & 768)) for (const v of [...(f.fl || []), ...(f.vd || [])]) { if (/intransitive/.test(v)) pos |= 512; else if (/transitive/.test(v)) pos |= 256; }
  } else {
    // inflected form of a base entry
    const bases = (e.base || []).map(b => b.split('|'));
    const wordHw = (f.hw || '').replace(/^\d+\s*/, '');
    base = bases[0]?.[0] || wordHw;
    for (const [, p] of bases) { const m = mapPos(p); if (m.abbr) abbr = true; else pos |= m.bits; }
    pos &= 255 | 256 | 512;
    if (pos & 4 && !(pos & 768)) for (const v of [...(f.fl || []), ...(f.vd || [])]) { if (/intransitive/.test(v)) pos |= 512; else if (/transitive/.test(v)) pos |= 256; }
    const w = e.w;
    const listed = (f.if || []).some(x => x.replace(/[^a-z]/g, '') === w);
    if (!listed) base = '';   // variant spelling / separate headword: treat as its own word
    const stem = (base || wordHw).replace(/\s/g, '');
    const irregular = !regular(stem, w);
    if (pos & 1 && /(s|es|ies)$/.test(w) && !irregular) form = FORM.plural;
    else if (pos & 1 && irregular) form = FORM.plural;
    else if (pos & 4 && /ing$/.test(w)) form = FORM.prp;
    else if (pos & 4 && /(ed|d)$/.test(w) && !irregular) form = FORM.past;
    else if (pos & 4 && /s$/.test(w) && !irregular) form = FORM.third;
    else if (pos & 4) form = FORM.irr;
    else if (pos & (8 | 16) && /(er|r|ier)$/.test(w) && !irregular) form = FORM.comp;
    else if (pos & (8 | 16) && /(est|st|iest)$/.test(w) && !irregular) form = FORM.sup;
    else if (pos & (8 | 16) && irregular) form = FORM.irr;
    else form = pos & 4 ? FORM.irr : FORM.base;
    if (!base) form = FORM.base;
  }
  let irrBase = 0;
  if (exact.length && (pos & (4 | 8 | 16))) {
    const forms = (f.if || []).map(x => x.replace(/[^a-z]/g, '')).filter(Boolean);
    if (forms.length && forms.some(x => x.length >= 3 && !regular(e.w, x) && x !== e.w)) irrBase = 1;
  }
  if (abbr && !pos) flags |= FLAG.abbr;
  rows.push([e.w, pos | (irrBase << 10), flags, form, base || 0, pn[e.w] ? pn[e.w].join(',') : 0]);
}
rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
fs.mkdirSync('site/data', { recursive: true });
fs.writeFileSync('site/data/words.json', JSON.stringify({ fields: ['w', 'pos', 'flags', 'form', 'base', 'pronoun'], built: new Date().toISOString(), rows }));
console.log('rows', rows.length, 'not found', skipped);
