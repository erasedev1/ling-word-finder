'use strict';
// Play mode: roll cubes, get demands, find words against the clock, then see what you missed.
const G = { round: null, timer: 0, found: [], missed: [], shown: 0, map: null };
const MISS_PAGE = 300;
const MIN_WORDS = 8;
const CUBE_WEIGHTS = { e: 12, a: 9, i: 9, o: 8, n: 6, r: 6, t: 6, l: 4, s: 4, u: 4, d: 4, g: 3, b: 2, c: 2, m: 2, p: 2, f: 2, h: 2, v: 2, w: 2, y: 2, k: 1, j: 1, x: 1, q: 1, z: 1 };
const CUBE_BAG = Object.entries(CUBE_WEIGHTS).flatMap(([l, n]) => Array(n).fill(l));
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function rollCubes(n) {
  for (;;) {
    const c = Array.from({ length: n }, () => pick(CUBE_BAG));
    if (c.filter(l => 'aeiou'.includes(l)).length >= 2 && c.filter(l => !'aeiou'.includes(l)).length >= 2) return c;
  }
}

// Build one candidate round: cubes + demands, with its full answer list.
function makeRound() {
  const div = $('gDiv').value, d = DIV[div], n = +$('gCubes').value;
  const typeSel = $('gType').value;
  const type = typeSel === 'random' ? pick(d.types.filter(t => t !== 'interjection' && t !== 'conjunction')) : typeSel;
  const cubes = rollCubes(n);
  const demands = [`Type: <b>${type}</b>`];
  const P = Object.assign(readParams(), {
    lenMin: 4, lenMax: 10, have: '', not: '', from: '', to: '', dv: false, dc: false, re: null,
    mode: 'mat', useAll: false, L: parseCubes(cubes.join('')), R: parseCubes(''), cubes: true,
    pat: '', typeBit: TYPES.find(t => t[0] === type)[1], groups: [],
  });
  if ($('gForm').checked && Math.random() < 0.4) {
    const gs = (GROUPS[type] || []).filter(g => !g.gate || d[g.gate]);
    if (gs.length) {
      const g = pick(gs), o = pick(g.opts.filter(o => !o[3] || d[o[3]]));
      P.groups = [{ g, sel: [o] }];
      demands.push(`Form: <b>${o[1].toLowerCase()}</b>`);
    }
  }
  if ($('gExtra').checked && Math.random() < 0.6) {
    const kind = pick(['len', 'have', 'not', 'dv', 'dc']);
    if (kind === 'len') {
      const lo = 4 + Math.floor(Math.random() * Math.min(3, n - 3));
      const exact = Math.random() < 0.5;
      P.lenMin = lo; if (exact) P.lenMax = lo;
      demands.push(`Letters: <b>${exact ? lo : lo + '+'}</b>`);
    } else if (kind === 'have') { P.have = pick(cubes); demands.push(`Must contain <b>${P.have.toUpperCase()}</b>`); }
    else if (kind === 'not') { P.not = pick(cubes); demands.push(`Must not contain <b>${P.not.toUpperCase()}</b>`); }
    else if (kind === 'dv') { P.dv = true; demands.push('<b>Double vowel</b>'); }
    else { P.dc = true; demands.push('<b>Double consonant</b>'); }
  }
  const answers = filterRows(P);
  return { cubes, demands, answers, P, type, div };
}

function newRound() {
  if (!S.rows.length) { $('gMsg').textContent = 'Word list is still loading.'; return null; }
  let best = null;
  for (let i = 0; i < 300; i++) {
    const r = makeRound();
    if (!best || r.answers.length > best.answers.length) best = r;
    if (r.answers.length >= MIN_WORDS) return r;
  }
  return best;
}

function showScreen(name) {
  $('gSetup').hidden = name !== 'setup';
  $('gPlay').hidden = name !== 'play';
  $('gResult').hidden = name !== 'result';
}

function startRound() {
  const r = newRound();
  if (!r || !r.answers.length) { return; }
  G.round = r; G.found = []; G.words = new Set(r.answers.map(x => x.w));
  G.map = G.map || new Map(S.rows.map(x => [x.w, x]));
  showScreen('play');
  $('gInput').disabled = true; $('gEntry').querySelector('button').disabled = true; $('gEnd').disabled = true;
  $('gFound').innerHTML = ''; $('gMsg').textContent = ''; $('gMsg').className = '';
  $('demands').innerHTML = r.demands.map(x => `<span class="dem">${x}</span>`).join('');
  $('gCount').textContent = '';
  $('timer').className = ''; $('timer').textContent = fmtTime(+$('gTime').value);
  // dice roll animation, then the clock starts
  const dice = $('dice'); dice.innerHTML = r.cubes.map(() => '<div class="die rolling">?</div>').join('');
  const els = [...dice.children];
  const spin = setInterval(() => els.forEach(e => { e.textContent = pick(CUBE_BAG); }), 70);
  setTimeout(() => {
    clearInterval(spin);
    els.forEach((e, i) => { e.classList.remove('rolling'); e.textContent = r.cubes[i]; });
    beginClock();
  }, 1100);
}

function beginClock() {
  const total = +$('gTime').value, end = Date.now() + total * 1000;
  $('gInput').disabled = false; $('gEntry').querySelector('button').disabled = false; $('gEnd').disabled = false;
  $('gInput').value = ''; $('gInput').focus();
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    $('timer').textContent = fmtTime(left);
    $('timer').classList.toggle('low', left <= 10);
    if (left <= 0) endRound();
  };
  clearInterval(G.timer); G.timer = setInterval(tick, 200); tick();
  updateCount();
}

function updateCount() {
  $('gCount').textContent = `${G.found.length} word${G.found.length === 1 ? '' : 's'} found`;
}

function submitWord(e) {
  e.preventDefault();
  const w = $('gInput').value.trim().toLowerCase().replace(/[^a-z]/g, '');
  $('gInput').value = '';
  if (!w || !G.round) return;
  const say = (m, c) => { $('gMsg').textContent = m; $('gMsg').className = c || ''; };
  if (w.length < 4) return say(`"${w}" is too short (4+ letters).`, 'bad');
  if (G.found.includes(w)) return say(`Already found "${w}".`);
  if (G.words.has(w)) {
    G.found.push(w);
    const s = document.createElement('span'); s.className = 'hit'; s.textContent = w; $('gFound').prepend(s);
    updateCount();
    return say(`+ ${w}`, 'ok');
  }
  const row = G.map.get(w);
  if (!row) return say(`"${w}" isn't in the word list.`, 'bad');
  const spellable = filterRows(Object.assign({}, G.round.P, { lenMin: 1, lenMax: 99, typeBit: 0, groups: [], have: '', not: '', dv: false, dc: false, exObs: false, exSlang: false, exDial: false, exAbbr: false, headOnly: false }), [row]).length;
  say(spellable ? `"${w}" is a word, but doesn't meet the demands.` : `"${w}" can't be made from these cubes.`, 'bad');
}

function endRound() {
  if (!G.round) return;
  clearInterval(G.timer);
  const r = G.round; G.round = null;
  const got = new Set(G.found);
  G.missed = r.answers.filter(x => !got.has(x.w)).sort((a, b) => b.w.length - a.w.length || (a.w < b.w ? -1 : 1));
  G.shown = 0;
  const total = r.answers.length, pts = G.found.reduce((s, w) => s + w.length, 0);
  $('gScore').textContent = `You found ${G.found.length} of ${total} word${total === 1 ? '' : 's'} (${total ? Math.round(100 * G.found.length / total) : 0}%) – ${pts} points`;
  $('gDemandRecap').innerHTML = `<span class="dem">Cubes: <b>${r.cubes.join(' ').toUpperCase()}</b></span>` + r.demands.map(x => `<span class="dem">${x}</span>`).join('');
  $('gHit').innerHTML = G.found.length ? G.found.map(w => `<span class="hit">${w}</span>`).join('') : '<span class="note">Nothing this time.</span>';
  $('gMissN').textContent = `(${G.missed.length.toLocaleString()})`;
  $('gMiss').innerHTML = '';
  showMissed();
  showScreen('result');
  window.scrollTo({ top: 0 });
}

function showMissed() {
  const frag = document.createDocumentFragment();
  for (const r of G.missed.slice(G.shown, G.shown + MISS_PAGE)) frag.append(card(r));
  G.shown = Math.min(G.missed.length, G.shown + MISS_PAGE);
  $('gMiss').append(frag);
  $('gMore').hidden = G.shown >= G.missed.length;
  $('gMore').textContent = `Show more (${(G.missed.length - G.shown).toLocaleString()} left)`;
}

function fillTypes() {
  const d = DIV[$('gDiv').value], sel = $('gType'), prev = sel.value;
  sel.innerHTML = '<option value="random">Random</option>' + TYPES.filter(t => d.types.includes(t[0])).map(t => `<option value="${t[0]}">${t[2]}</option>`).join('');
  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function setMode(m) {
  document.body.classList.toggle('play', m === 'play');
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('game').hidden = m !== 'play';
  if (m === 'play' && !G.round && $('gResult').hidden) showScreen('setup');
}

for (let i = 6; i <= 12; i++) $('gCubes').add(new Option(i, i));
$('gCubes').value = 8;
fillTypes();
$('gDiv').addEventListener('change', fillTypes);
document.querySelectorAll('.mode').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('gRoll').onclick = startRound;
$('gAgain').onclick = () => showScreen('setup');
$('gEnd').onclick = endRound;
$('gMore').onclick = showMissed;
$('gEntry').addEventListener('submit', submitWord);
