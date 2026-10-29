# LinguiSHTIK Word Finder

Filter legal LinguiSHTIK words (4-10 letters) by cubes/letters, part of speech (the
Player Two TYPE demand), word form, sentence pattern, and the AGLOA General Demands
(number of letters, must contain / not contain, letter transfer, double vowel/consonant,
color wild, Challenge Now / Impossible), per division (Elementary, Middle, Junior, Senior).

The word list comes from the official LinguiSHTIK dictionary, Webster's Third New
International Unabridged (Merriam-Webster Unabridged via Britannica Education).

## Build the data (private; `data/` and `site/data/` are gitignored)

The dictionary is licensed content behind the AGLOA login, so the scraped word data is
**not committed**. Rebuild it locally:

```sh
# 1. log in once (Playwright) and export the session cookie to a file
#    (login page: https://education.eb.com/en-US/?target=https%253A%252F%252Fdictionary.eb.com)
export COOKIE_FILE=/path/to/cookie.txt         # "name=value; name2=value2" for unabridged.merriam-webster.com
node scraper/browse.mjs     # index -> data/candidates.txt   (~1 min)
node scraper/entries.mjs    # lookups -> data/entries.jsonl  (~10 min, resumable)
node scraper/build.mjs      # -> site/data/words.json
```

## Run

```sh
cd site && python3 -m http.server 8765    # then open http://localhost:8765
```

## Play mode
The **Play mode** button rolls 6–12 letter cubes, picks a part of speech (optionally plus a
word-form or general demand such as number of letters / must contain / double vowel) and starts a
timer (default 2:00). Type words as you find them; when time is up you see your score and every
valid word you missed. It reuses the Word Finder's filtering and respects the *Dictionary rules*
checkboxes.

## Caveats
- Parts of speech/transitivity come from Merriam-Webster's entry list; plural/past/-ing/comparative
  forms and regular/irregular are inferred from the entry's inflection list. A judge's check
  against the dictionary is still final.
- Usage labels (obsolete, slang, ...) are read from the first displayed entry and may apply to only one sense.
- Function demands (subject, direct object, ...), clauses, phrases and compound words depend on the
  sentence, so they are shown for reference but not filtered.
