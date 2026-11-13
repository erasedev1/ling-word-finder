#!/usr/bin/env python3
"""Stream the Wiktionary extract (kaikki.org) and keep, for each 4-10 letter word, the POS, sense tags and
useful categories (e.g. 'English collective nouns', 'English countable nouns'). Output: data/wikt.jsonl
Usage: curl -sS https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl | python3 scraper/wikt.py"""
import sys, json, re
ok = re.compile(r'^[a-z]{4,10}$')
skip = re.compile(r'^(Terms with|Pages |Entries with|English terms (with|derived|spelled|prefixed|suffixed)|English lemmas|English (words|entries)|Requests|English terms with|.*translations|.*pronunciation|.*rhymes|.*IPA)', re.I)
out = open('data/wikt.jsonl', 'w')
n = 0
for line in sys.stdin:
    # cheap pre-filter on the word before parsing
    m = re.match(r'\{"[^"]*":[^{]*?"word": "([^"]*)"', line[:300]) or re.search(r'"word": "([^"]*)"', line[:2000]) or re.search(r'"word":"([^"]*)"', line[:2000])
    if m and not ok.match(m.group(1)): continue
    try: d = json.loads(line)
    except Exception: continue
    w = d.get('word', '')
    if not ok.match(w) or d.get('lang_code') != 'en': continue
    tags, cats = set(), set()
    glosses = []
    for s in d.get('senses', []):
        tags.update(s.get('tags', []))
        for c in s.get('categories', []):
            nm = c['name'] if isinstance(c, dict) else c
            if not skip.search(nm): cats.add(nm)
        if len(glosses) < 3 and s.get('glosses'): glosses.append(s['glosses'][-1][:140])
    ht = [h.get('expansion', '') for h in d.get('head_templates', [])][:2]
    ftags = sorted({t for f in d.get('forms', []) for t in f.get('tags', [])})
    out.write(json.dumps({'w': w, 'pos': d.get('pos'), 'tags': sorted(tags), 'cats': sorted(cats), 'ht': ht, 'ft': ftags, 'g': glosses}) + '\n')
    n += 1
print('entries', n, file=sys.stderr)
