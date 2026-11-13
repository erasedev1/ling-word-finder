// Tag collective nouns: entries whose definition describes a group/body/company/assemblage as a unit.
import fs from 'node:fs';
const HEADS = 'group|company|assemblage|assembly|collection|flock|herd|swarm|crowd|council|committee|band|cluster|school|pack|troop|throng|multitude|aggregation|gathering|congregation|colony|society|association|organization|brotherhood|fraternity|community|array|brood|litter|drove|covey|bevy|posse|team|crew|gang|corps|squad|clan|tribe|assortment|aggregate|corporation|league|guild|delegation|faction|sect|retinue|entourage|cortege|faculty|mob|horde|fleet|flotilla|squadron|regiment|battalion|choir|ensemble|orchestra|jury|panel|cabinet|synod|conclave|senate|parliament|clergy|nobility|peerage|gentry|populace|peasantry|aristocracy|hive|pod|gam|shoal|skein|pride|bunch|batch';
const BODYADJ = 'representative|ruling|governing|deliberative|legislative|administrative|advisory|official|organized|collective|judicial|elected|select|religious|military|authorized|corporate|political|ecclesiastical|learned|professional|consultative|supervisory|executive|policy-making|governmental|armed';
const START = '(?:^|: |; )(?:an? |the )';
const SENSE = new RegExp(START + '(?:[a-z-]+ ){0,3}?(?:' + HEADS + ')\\b(?: of| consisting| composed| made up| comprising| that| who| which| organized| formed| in\\b| esp| usu|,|$| \\()', 'i');
const BODY = new RegExp(START + '(?:[a-z-]+ ){0,4}?(?:' + BODYADJ + ')(?: [a-z-]+){0,2} body\\b', 'i');
const BAD = /^(?:: )?(?:an? |the )?(?:[a-z-]+ )*?(?:member|part|place|pod|chest|science|director|book|tender|material|substance|compound|resin|dye|plant|animal|person who|one that)\b/i;
const out = [];
for (const l of fs.readFileSync('data/defs.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const { w, d } = JSON.parse(l);
  if (!d) continue;
  // keep only the noun sections of the entry text (drop verb/adj sections) and limit to senses
  const body = d.replace(/^.*?\\ [^\\]*\\ /, '');
  const idx = body.search(/ (?:verb|adjective|adverb|preposition|interjection|conjunction) /);
  const nounPart = idx > 0 ? body.slice(0, idx) : body;
  const senses = nounPart.split(/(?= [0-9] | [a-z] : |: )/).slice(0, 8);
  const hit = senses.slice(0, 6).find(s => { const t = s.trim().replace(/^[0-9a-z] (?=:)/, ''); return (SENSE.test(t) || BODY.test(t)) && !BAD.test(t); });
  if (hit) out.push(w + '\t' + hit.trim().slice(0, 120));
}
fs.writeFileSync('data/collective.tsv', out.join('\n') + '\n');
console.log(out.length);
