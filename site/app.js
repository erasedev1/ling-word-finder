'use strict';
const $ = id => document.getElementById(id);
const PAGE = 400;

// ---- Order of Play data (from the 2024-27 AGLOA Order of Play sheets) ----
const TYPES = [
  ['noun', 1, 'Noun'], ['pronoun', 2, 'Pronoun'], ['verb', 4, 'Verb'], ['adjective', 8, 'Adjective'],
  ['adverb', 16, 'Adverb'], ['preposition', 32, 'Preposition'], ['conjunction', 64, 'Conjunction'], ['interjection', 128, 'Interjection'],
];
const DIV = {
  el: { name: 'Elementary', types: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'interjection'], adverbDegree: false, participles: false,
    patterns: ['S-V', 'S-V-DO', 'S-V-IO-DO', 'S-LV-PN', 'S-LV-PA'],
    functions: { noun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Noun Used as Adjective', verb: 'Main Verb, Infinitive', adjective: 'Noun Modifier, Pronoun Modifier, Predicate Adjective, Adjacent Adjective', adverb: 'none', preposition: 'none', interjection: 'none' } },
  mid: { name: 'Middle', types: TYPES.map(t => t[0]).filter(t => true), adverbDegree: true, participles: true,
    patterns: ['S-V', 'S-V-DO', 'S-V-IO-DO', 'S-LV-PN', 'S-LV-PA', 'Inverted'],
    functions: { noun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Noun Used as Adjective', pronoun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive', verb: 'Main Verb, Auxiliary, Infinitive, Gerund, Participle', adjective: 'Noun Modifier, Pronoun Modifier, Predicate Adjective, Adjacent Adjective', adverb: 'Verb Modifier, Adjective Modifier, Adverb Modifier', preposition: 'Introductory Word in an Adjective Phrase / Adverb Phrase', conjunction: 'Subordinator, Conjunctive Adverb', interjection: 'none' } },
  jr: { name: 'Junior', types: TYPES.map(t => t[0]), adverbDegree: true, participles: true,
    patterns: ['S-V', 'S-V-DO', 'S-V-IO-DO', 'S-LV-PN', 'S-LV-PA', 'Inverted', 'S-V-DO-OC (n)', 'S-V-DO-OC (adj)'],
    functions: { noun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Noun Used as Adjective, Objective Complement', pronoun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Objective Complement', verb: 'Main Verb, Auxiliary, Infinitive, Gerund, Participle', adjective: 'Noun Modifier, Pronoun Modifier, Predicate Adjective, Adjacent Adjective, Objective Complement', adverb: 'Verb Modifier, Adjective Modifier, Adverb Modifier', preposition: 'Introductory Word in an Adjective Phrase / Adverb Phrase', conjunction: 'Subordinator, Conjunctive Adverb', interjection: 'none' } },
  sr: { name: 'Senior', types: TYPES.map(t => t[0]), adverbDegree: true, participles: true,
    patterns: ['S-V', 'S-V-DO', 'S-V-IO-DO', 'S-LV-PN', 'S-LV-PA', 'Inverted', 'S-V-DO-OC (n)', 'S-V-DO-OC (adj)', 'S-V-Retained DO', 'S-V-Retained IO', 'S-V-Retained OC (noun)', 'S-V-Retained OC (adj)'],
    functions: { noun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Noun Used as Adjective, Objective Complement, Retained DO / IO / OC', pronoun: 'Subject, Direct Object, Indirect Object, Predicate Noun, Object of the Preposition, Appositive, Objective Complement, Retained DO / IO / OC', verb: 'Main Verb, Auxiliary, Infinitive, Gerund, Participle', adjective: 'Noun Modifier, Pronoun Modifier, Predicate Adjective, Adjacent Adjective, Objective Complement, Retained OC', adverb: 'Verb Modifier, Adjective Modifier, Adverb Modifier', preposition: 'Introductory Word in an Adjective Phrase / Adverb Phrase', conjunction: 'Subordinator, Conjunctive Adverb', interjection: 'none' } },
};
const GENERAL = {
  el: ['A. Color wild', 'B. Must contain letter', 'C. Must not contain letter', 'D. Letter transfer', 'E. Number of letters', 'F. Double vowel', 'G. Double consonant', 'H. Noun: singular, plural, collective', 'J. Verb: singular, plural, linking, regular, irregular, simple present/past/future', 'K. Adjective: positive, comparative, superlative degree', 'M. Clauses: noun, adjective, adverb', 'N. Phrases: appositive', 'O. Compound word'],
  mid: ['A. Color wild', 'B. Must contain letter', 'C. Must not contain letter', 'D. Letter transfer', 'E. Number of letters', 'F. Double vowel', 'G. Double consonant', 'H. Noun: singular, plural, collective', 'I. Pronoun: singular, plural, indefinite, personal, interrogative', 'J. Verb: singular, plural, linking, regular, irregular, simple tense', 'K. Adjective: degree, regular/irregular', 'L. Adverb: degree, regular/irregular', 'M. Clauses: noun, adjective, adverb, infinitive', 'N. Phrases: appositive, prepositional (adj/adv), infinitive', 'O. Compound word'],
  jr: ['A-G as above', 'H. Noun: singular, plural, collective, nominative, objective', 'I. Pronoun: singular, plural, indefinite, personal, interrogative, nominative, objective, possessive', 'J. Verb: singular, plural, linking, regular, irregular, present/past participle, simple/perfect tense, progressive, perfect progressive, function for infinitive/gerund', 'K. Adjective / L. Adverb: degrees, regular/irregular', 'M. Clauses / N. Phrases (max two per shake)', 'O. Compound word', 'P. Part of a direct / indirect quote', 'Q. Must NOT be contained in a clause, phrase or quote (once per shake)'],
  sr: ['A-G as above', 'H. Noun: singular, plural, collective, nominative, objective', 'I. Pronoun: singular, plural, indefinite, personal, interrogative, demonstrative, relative, nominative, objective, possessive', 'J. Verb: as Junior plus active / passive voice', 'K. Adjective / L. Adverb: degrees, regular/irregular', 'M. Clauses (incl. elliptical) / N. Phrases (max two per shake)', 'O. Compound word', 'P. Direct / indirect quote', 'Q. Must NOT be contained in (incl. elliptical clause)', 'R. Function of the demanded clause/phrase in the sentence'],
};

// ---- word forms offered as filters per Type demand ----
const FORM = { base: 0, plural: 1, third: 2, past: 3, prp: 4, comp: 5, sup: 6, irr: 7 };
const isIrr = r => r.form === FORM.irr || (r.pos & 1024) !== 0;
const GROUPS = {
  noun: [{ id: 'num', opts: [['singular', 'Singular', r => !r.base], ['plural', 'Plural', r => r.base && r.form === FORM.plural]] }],
  verb: [
    { id: 'shape', opts: [['pres', 'Base / present', r => !r.base], ['third', '-s form (3rd sing.)', r => r.form === FORM.third], ['past', 'Past (-ed)', r => r.form === FORM.past], ['prp', 'Present participle (-ing)', r => r.form === FORM.prp, 'participles'], ['irrf', 'Irregular form', r => r.form === FORM.irr]] },
    { id: 'reg', opts: [['reg', 'Regular', r => !isIrr(r)], ['irr', 'Irregular', isIrr]] },
  ],
  adjective: [
    { id: 'deg', opts: [['pos', 'Positive', r => !r.base], ['comp', 'Comparative', r => r.form === FORM.comp], ['sup', 'Superlative', r => r.form === FORM.sup]] },
    { id: 'reg', opts: [['reg', 'Regular', r => !isIrr(r)], ['irr', 'Irregular', isIrr]] },
  ],
  adverb: [
    { id: 'deg', gate: 'adverbDegree', opts: [['pos', 'Positive', r => !r.base], ['comp', 'Comparative', r => r.form === FORM.comp], ['sup', 'Superlative', r => r.form === FORM.sup]] },
    { id: 'reg', gate: 'adverbDegree', opts: [['reg', 'Regular', r => !isIrr(r)], ['irr', 'Irregular', isIrr]] },
  ],
  pronoun: [
    { id: 'pn', all: true, opts: ['singular', 'plural', 'indefinite', 'personal', 'interrogative', 'demonstrative', 'relative', 'nominative', 'objective', 'possessive'].map(k => [k, k[0].toUpperCase() + k.slice(1), r => r.pn.includes(k)]) },
  ],
};

// ---- state ----
const S = { type: null, forms: {}, rows: [], shown: 0, matches: [] };
const POSN = [[1, 'n'], [2, 'pron'], [4, 'v'], [8, 'adj'], [16, 'adv'], [32, 'prep'], [64, 'conj'], [128, 'interj']];
const FORMN = ['', 'plural', '-s form', 'past', '-ing form', 'comparative', 'superlative', 'irregular form'];

function buildStatic() {
  for (const sel of [$('lenMin'), $('lenMax')]) for (let i = 4; i <= 10; i++) sel.add(new Option(i, i));
  $('lenMin').value = 4; $('lenMax').value = 10;
  $('division').addEventListener('change', onDivision);
  onDivision();
  document.querySelectorAll('#filters input, #filters select').forEach(el => el.addEventListener('input', () => { if (el.id !== 'division') schedule(); }));
  $('reset').onclick = () => { location.reload(); };
  $('more').onclick = () => { renderMore(); };
}

function onDivision() {
  const d = DIV[$('division').value];
  const p = $('pattern');
  p.innerHTML = '<option value="">(any)</option>' + d.patterns.map(x => `<option>${x}</option>`).join('');
  const t = $('types'); t.innerHTML = '';
  const any = chip('Any type', S.type === null, () => { S.type = null; S.forms = {}; renderTypes(); schedule(); });
  t.append(any);
  for (const [id, , label] of TYPES) if (d.types.includes(id)) t.append(chip(label, S.type === id, () => { S.type = id; S.forms = {}; renderTypes(); schedule(); }));
  if (S.type && !d.types.includes(S.type)) S.type = null;
  renderTypes();
  const ref = $('refBody');
  ref.innerHTML = `<h3>Player Three &ndash; FUNCTION demands</h3>` + Object.entries(d.functions).map(([k, v]) => `<p><b>${k}</b>: ${v}</p>`).join('') +
    `<h3>General demands</h3>` + GENERAL[$('division').value].map(x => `<p>${x}</p>`).join('');
  schedule();
}
function chip(label, on, fn) {
  const b = document.createElement('span'); b.className = 'chip' + (on ? ' on' : ''); b.textContent = label; b.onclick = fn; return b;
}
function renderTypes() {
  [...$('types').children].forEach(c => c.classList.toggle('on', c.textContent === 'Any type' ? S.type === null : c.textContent.toLowerCase() === S.type));
  const d = DIV[$('division').value]; const box = $('forms'); box.innerHTML = '';
  const groups = GROUPS[S.type] || [];
  for (const g of groups) {
    if (g.gate && !d[g.gate]) continue;
    const opts = g.opts.filter(o => !o[3] || d[o[3]]);
    const wrap = document.createElement('div'); wrap.className = 'group chips';
    for (const [id, label] of opts) {
      const key = g.id + ':' + id;
      wrap.append(chip(label, !!S.forms[key], function () { S.forms[key] = !S.forms[key]; this.classList.toggle('on', S.forms[key]); schedule(); }));
    }
    box.append(wrap);
  }
  $('functionNote').textContent = S.type ? `Function demands for ${S.type} (${d.name}): ${d.functions[S.type] || '-'}. Functions depend on the sentence, so they are not filtered.` : '';
}

// ---- filtering ----
let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(run, 120); }
const VOWELS = /[aeiou]/;
function parseCubes(s) {
  const c = {}; let wild = 0, n = 0;
  for (const ch of s.toLowerCase()) { if (ch === '*') { wild++; n++; } else if (/[a-z]/.test(ch)) { c[ch] = (c[ch] || 0) + 1; n++; } }
  return { c, wild, n };
}
function transfer(cubes, from, to) {
  if (!from || !to || from === to) return cubes;
  const c = { ...cubes.c }; if (c[from]) { c[to] = (c[to] || 0) + c[from]; delete c[from]; }
  return { c, wild: cubes.wild, n: cubes.n };
}
function patternRe(p) {
  p = p.trim().toLowerCase(); if (!p) return null;
  return new RegExp('^' + p.replace(/[^a-z?*]/g, '').replace(/\?/g, '[a-z]').replace(/\*/g, '[a-z]*') + '$');
}
function buildable(counts, len, L, R, mode, useAll) {
  // L: cubes in Letters, R: cubes in Resources. Returns true if the word can be spelled.
  let need = 0; const defL = {};
  for (const ch in counts) { const d = counts[ch] - (L.c[ch] || 0); if (d > 0) { defL[ch] = d; need += d; } }
  if (useAll) { for (const ch in L.c) if ((counts[ch] || 0) < L.c[ch]) return false; if (len < L.n) return false; }
  let wl = L.wild;
  if (mode === 'imp') {
    let t = 0; for (const ch in defL) t += Math.max(0, defL[ch] - (R.c[ch] || 0));
    return t <= wl + R.wild;
  }
  const k = mode === 'now' ? 1 : 0;
  let unco = 0; for (const ch in defL) unco += Math.max(0, defL[ch] - (R.c[ch] || 0));
  const coverable = need - unco;
  const wlUnco = Math.min(wl, unco), remUnco = unco - wlUnco;
  const wlLeft = wl - wlUnco, remOther = Math.max(0, coverable - wlLeft);
  if (remUnco > R.wild) return false;
  return remUnco + remOther <= k;
}

function run() {
  if (!S.rows.length) return;
  const get = id => $(id);
  const lenMin = +get('lenMin').value, lenMax = +get('lenMax').value;
  const have = get('mustHave').value.trim().toLowerCase(), not = get('mustNot').value.trim().toLowerCase();
  const from = get('ltFrom').value.trim().toLowerCase(), to = get('ltTo').value.trim().toLowerCase();
  const dv = get('dblVowel').checked, dc = get('dblCons').checked;
  const re = patternRe(get('pattern2').value);
  const mode = get('challenge').value, useAll = get('useAllLetters').checked;
  const L = transfer(parseCubes(get('matLetters').value), from, to), R = transfer(parseCubes(get('resLetters').value), from, to);
  const cubes = mode !== 'off' && (L.n + R.n) > 0;
  const exObs = get('exObs').checked, exSlang = get('exSlang').checked, exDial = get('exDial').checked, exAbbr = get('exAbbr').checked, headOnly = get('headOnly').checked;
  const pat = get('pattern').value;
  const typeBit = S.type ? TYPES.find(t => t[0] === S.type)[1] : 0;
  const groups = (GROUPS[S.type] || []).map(g => ({ g, sel: g.opts.filter(o => S.forms[g.id + ':' + o[0]]) })).filter(x => x.sel.length);
  const dblv = /(aa|ee|ii|oo|uu)/, dblc = /([bcdfghjklmnpqrstvwxyz])\1/;
  const out = [];
  for (const r of S.rows) {
    const w = r.w, n = w.length;
    if (n < lenMin || n > lenMax) continue;
    if (headOnly && r.base) continue;
    if (exAbbr && (r.flags & 32)) continue;
    if (exObs && (r.flags & 1)) continue;
    if (exSlang && (r.flags & 12)) continue;
    if (exDial && (r.flags & 16)) continue;
    if (have && !w.includes(have)) continue;
    if (not && w.includes(not)) continue;
    if (from && to && from !== to && w.includes(from)) continue;
    if (re && !re.test(w)) continue;
    if (dv && !dblv.test(w)) continue;
    if (dc && !dblc.test(w)) continue;
    if (typeBit) {
      if (!(r.pos & typeBit)) continue;
      if (typeBit === 4 && pat) {
        const tr = pat === 'S-V' || pat === 'Inverted' ? 512 : /^S-LV/.test(pat) ? 0 : 256;
        if (tr && (r.pos & 768) && !(r.pos & tr)) continue;
      }
      let ok = true;
      for (const { g, sel } of groups) {
        const hit = g.all ? sel.every(o => o[2](r)) : sel.some(o => o[2](r));
        if (!hit) { ok = false; break; }
      }
      if (!ok) continue;
    }
    if (cubes) {
      const counts = {}; for (const ch of w) counts[ch] = (counts[ch] || 0) + 1;
      if (!buildable(counts, n, L, R, mode, useAll)) continue;
    }
    out.push(r);
  }
  const sort = get('sort').value;
  if (sort === 'len') out.sort((a, b) => b.w.length - a.w.length || (a.w < b.w ? -1 : 1));
  else if (sort === 'rand') for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  S.matches = out; S.shown = 0; $('list').innerHTML = '';
  $('summary').textContent = `${out.length.toLocaleString()} word${out.length === 1 ? '' : 's'} match` + (out.length > PAGE ? ` (showing ${PAGE})` : '');
  renderMore();
}
function renderMore() {
  const frag = document.createDocumentFragment();
  for (const r of S.matches.slice(S.shown, S.shown + PAGE)) frag.append(card(r));
  S.shown = Math.min(S.matches.length, S.shown + PAGE);
  $('list').append(frag);
  $('more').hidden = S.shown >= S.matches.length;
  if (!$('more').hidden) $('more').textContent = `Show more (${(S.matches.length - S.shown).toLocaleString()} left)`;
  if (S.shown > PAGE) $('summary').textContent = `${S.matches.length.toLocaleString()} words match (showing ${S.shown.toLocaleString()})`;
}
function card(r) {
  const a = document.createElement('a'); a.className = 'w'; a.target = '_blank'; a.rel = 'noopener';
  a.href = 'https://unabridged.merriam-webster.com/unabridged/' + encodeURIComponent(r.w);
  const tags = POSN.filter(([b]) => r.pos & b).map(([, t]) => t === 'v' ? (r.pos & 256 && !(r.pos & 512) ? 'vt' : r.pos & 512 && !(r.pos & 256) ? 'vi' : 'v') : t).join('/');
  const bits = [];
  if (tags) bits.push(tags);
  if (r.base) bits.push(`<span class="f">${FORMN[r.form] || 'form'} of ${r.base}</span>`);
  const bad = []; if (r.flags & 1) bad.push('obs'); if (r.flags & 2) bad.push('archaic'); if (r.flags & 4) bad.push('slang'); if (r.flags & 8) bad.push('vulgar'); if (r.flags & 16) bad.push('dial'); if (r.flags & 32) bad.push('abbr');
  if (bad.length) bits.push(`<span class="bad">${bad.join(',')}</span>`);
  a.innerHTML = `<b>${r.w}</b><small>${bits.join(' &middot; ')}</small>`;
  return a;
}

async function load() {
  buildStatic();
  try {
    const res = await fetch('data/words.json'); if (!res.ok) throw new Error(res.status);
    const j = await res.json();
    S.rows = j.rows.map(([w, pos, flags, form, base, pn]) => ({ w, pos, flags, form, base: base || '', pn: pn ? pn.split(',') : [] }));
    run();
  } catch (e) {
    $('summary').textContent = 'Could not load data/words.json. Build it first: node scraper/build.mjs (see README).';
  }
}
load();
