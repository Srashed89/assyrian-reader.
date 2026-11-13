# Assyrian Reader

Learn to read the Assyrian (Eastern Syriac) script from words you already speak.

The app has 22 letters, 11 marks and 46 words. It introduces a few letters and marks at a time, then shows a word you already say that uses only what you have met. It works offline and can be added to a phone's home screen.

`SPEC.md` is the full build plan: purpose, content model, sources and licences, learning rules, roadmap and open risks.

## Run it

You need Node.js 22.12 or later.

```
npm install
npm run dev        # work on it locally
npm run check      # type check, tests and production build
npm run preview    # serve the production build
```

The production build lands in `dist/`. It is a folder of static files with relative paths, so any static host can serve it from any folder.

## Layout

| Path | What it holds |
| --- | --- |
| `content/` | All letters, marks, words and categories, as JSON. The only place content lives. |
| `src/lib/script.ts` | Splits a word into letter clusters, sounds it out, and reads it into transliteration for the validator. |
| `src/lib/order.ts` | Builds the lesson order from the content. |
| `src/lib/scheduler.ts` | Boxes, review intervals, and how a practice round is put together. |
| `src/lib/questions.ts` | Builds the four-option questions. |
| `src/lib/storage.ts` | Saves progress on the device and exports the learner's notes. |
| `src/components/` | The screens. |
| `tests/` | The spelling validator and tests for every rule above. |
| `reference/prototype.html` | The original single-page prototype, kept for comparison. |

## Add a word

1. Add a record to `content/words.json` with the spelling exactly as the source gives it, vowel marks included, and the source's own transliteration.
2. Run `npm test`. The validator reads the spelling by rule and fails if it does not match the transliteration.
3. Leave `checked` as `false` until a fluent reader has confirmed the spelling.

Nothing else needs changing: the sounding-out, the lesson order and the questions are all worked out from the spelling.

## Licences

Word spellings and transliterations come from [Wiktionary](https://en.wiktionary.org/wiki/Appendix:Assyrian_Neo-Aramaic_Swadesh_list) and are used under CC BY-SA 4.0. The word list in `content/words.json` is shared under the same licence. The bundled fonts (Noto Sans Syriac Eastern, Bricolage Grotesque, Gentium Book Plus) are under the SIL Open Font Licence.
