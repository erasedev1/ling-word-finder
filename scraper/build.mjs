// Phase 3: turn data/entries.jsonl into site/data/words.json (compact rows for the browser).
import fs from 'node:fs';
const POS = ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'];
// bits in `pos`; bit 8-9 = verb transitivity (8 transitive, 9 intransitive)
const FORM = { base: 0, plural: 1, third: 2, past: 3, prp: 4, comp: 5, sup: 6, irr: 7 };
const FLAG = { obsolete: 1, archaic: 2, slang: 4, vulgar: 8, dialect: 16, abbr: 32, collective: 64 };
// ---- Wiktionary (kaikki.org extract, data/wikt.jsonl) is the second dictionary used to tag every word ----
const TAGS = ['collective', 'countable', 'uncountable', 'plural-only', 'not-comparable', 'transitive', 'intransitive', 'ambitransitive',
  'plural', 'comparative', 'superlative', 'past', 'present', 'participle', 'gerund', 'third-person', 'form-of', 'alt-of', 'abbreviation',
  'obsolete', 'archaic', 'slang', 'vulgar', 'nonstandard', 'misspelling', 'dialectal'];
const TAGIDX = Object.fromEntries(TAGS.map((t, i) => [t, i]));
const GROUPGLOSS = /^(?:an? |the )?(?:[a-z-]+ ){0,3}?(?:group|collection|assembly|assemblage|gathering|council|committee|body|company|flock|herd|swarm|crowd|congregation|society|association|organi[sz]ation|community|band|cluster|school|pack|troop|team|crew|gang|corps|clan|tribe|brood|litter|set|array|number)\b/i;
const PBIT = { noun: 1, pron: 2, verb: 4, adj: 8, adv: 16, prep: 32, conj: 64, intj: 128 };
const WIKT = new Map();   // word -> { tags:Set, collective:boolean, groupGloss:boolean }
if (fs.existsSync('data/wikt.jsonl')) for (const l of fs.readFileSync('data/wikt.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const d = JSON.parse(l); let o = WIKT.get(d.w); if (!o) WIKT.set(d.w, o = { byPos: new Map(), collective: false, groupGloss: false, noun: false });
  const pb = PBIT[d.pos] || 0; let ts = o.byPos.get(pb); if (!ts) o.byPos.set(pb, ts = new Set());
  for (const t of d.tags) if (t in TAGIDX && t !== 'collective') ts.add(t);
  if (d.pos === 'noun') {
    o.noun = true;
    if (d.tags.includes('collective') || d.cats.includes('Collectives')) o.collective = true;
    if ((d.g || []).some(g => GROUPGLOSS.test(g))) o.groupGloss = true;
  }
}
// our earlier candidates (Merriam-Webster definition heuristic + terms of venery) only survive if Wiktionary supports them
const MWCAND = new Set(fs.existsSync('data/collective.tsv') ? fs.readFileSync('data/collective.tsv', 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')[0]) : []);
// terms of venery come from Wiktionary's own "English collective nouns" appendix / Wikipedia's animal-names list: keep them if Wiktionary has the noun
const VENERY = new Set(fs.existsSync('scraper/venery.js') ? (fs.readFileSync('scraper/venery.js', 'utf8').split('`')[1] || '').split(/\s+/).filter(Boolean) : []);
const COLL = new Set([...WIKT].filter(([w, o]) => o.collective || (MWCAND.has(w) && o.groupGloss) || (VENERY.has(w) && o.noun)).map(([w]) => w));
const CAND = new Set([...MWCAND, ...VENERY]);
let collDropped = [...CAND].filter(w => !COLL.has(w)).length;
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

// ---- LT 22 illegal words, judged on Merriam-Webster's own labels (data/labels.jsonl, from scraper/labels.mjs) ----
// obsolete (archaic is allowed), slang/vulgar -> only when EVERY sense carries the label; proper nouns -> headword is capitalized and is the word itself
const LABELS = new Map(fs.existsSync('data/labels.jsonl') ? fs.readFileSync('data/labels.jsonl', 'utf8').split('\n').filter(Boolean).map(l => { const d = JSON.parse(l); return [d.w, d]; }) : []);
const illegal = w => {
  const d = LABELS.get(w); if (!d || d.missing) return null;
  if (d.n && d.obs === d.n) return 'obsolete';
  if (d.n && (d.slang === d.n || d.vulg === d.n)) return 'slang/vulgar';
  if (d.cap && d.hw.replace(/[^A-Za-z]/g, '').toLowerCase() === w && !/adjective/.test(d.fl)) return 'proper noun';
  return null;
};
const illegalCount = {};
const rows = [];
const lines = fs.readFileSync('data/entries.jsonl', 'utf8').split('\n').filter(Boolean);
let skipped = 0, abbrDropped = 0;
for (const line of lines) {
  const e = JSON.parse(line);
  if (!e.found) { skipped++; continue; }
  { const why = illegal(e.w); if (why) { illegalCount[why] = (illegalCount[why] || 0) + 1; continue; } }
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
  if (abbr && !pos) { abbrDropped++; continue; }   // LT 22E: an abbreviated version of a word is illegal (also affixes/symbols)
  const wk = WIKT.get(e.w); const tagset = new Set();
  if (wk) for (const [pb, ts] of wk.byPos) if (!(pos & 255) || (pb & pos)) for (const t of ts) tagset.add(t);
  if (!base) for (const t of ['plural', 'comparative', 'superlative', 'past', 'present', 'participle', 'gerund', 'third-person', 'form-of']) tagset.delete(t);   // inflection tags only describe inflected rows
  if (COLL.has(e.w) && (pos & 1)) tagset.add('collective');
  if (base && form === FORM.plural && COLL.has(base)) tagset.add('collective');   // plural of a collective noun
  if (base && form === FORM.plural) tagset.add('plural'); if (form === FORM.comp) tagset.add('comparative'); if (form === FORM.sup) tagset.add('superlative');
  rows.push([e.w, pos | (irrBase << 10), flags, form, base || 0, pn[e.w] ? pn[e.w].join(',') : 0, [...tagset].map(t => TAGIDX[t]).sort((x, y) => x - y).join(',')]);
}
rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
fs.mkdirSync('site/data', { recursive: true });
fs.writeFileSync('site/data/words.json', JSON.stringify({ fields: ['w', 'pos', 'flags', 'form', 'base', 'pronoun', 'tags'], tags: TAGS, built: new Date().toISOString(), rows }));
fs.writeFileSync('site/data/words.js', 'window.WORDS=' + fs.readFileSync('site/data/words.json', 'utf8') + ';');
console.log('rows', rows.length, 'not found', skipped, '| wikt-covered', rows.filter(r => WIKT.has(r[0])).length, '| collective', rows.filter(r => r[6].split(',').includes('0')).length, '| earlier candidates dropped', collDropped, '| abbreviations/affixes dropped', abbrDropped, '| illegal dropped', JSON.stringify(illegalCount));
