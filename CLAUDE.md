# Working on Assyrian Reader

Read `SPEC.md` first. It holds the purpose, the content model, the learning rules, the roadmap and the open risks. Phase 1 (the port of the prototype) is done; work proceeds one roadmap phase at a time.

## Commands

- `npm run check` runs the type check, the tests and the production build. Run it before every commit.
- `npm test` runs the tests alone. `npm run dev` starts a local server.

## Rules that must hold

- **Content lives only in `content/*.json`.** No Assyrian word, letter or mark is written into a component. Tests may quote a spelling to pin down how one word is read, or to show that a wrong spelling is caught.
- **Spellings are copied, never typed from memory.** Every word needs a source and that source's transliteration. `tests/content.test.ts` reads each spelling by rule and fails the build if it does not match. Do not loosen that test to make a word pass: fix or drop the word.
- **Never edit a spelling to match a pronunciation.** The learner's own reading is saved separately (`mine` in the learner state).
- **Every piece of script goes through the `Sy` component**, which sets `lang="syr"`, `dir="rtl"` and the script font.
- **Never wrap part of a word in its own element.** Styling inside a word can break the joins between letters. To highlight a letter, show each cluster in its own box, as `Breakdown` does.
- **Walk script strings by code point** (`for...of` or `clusters()`), never by index.
- **Derived things stay derived.** The sounding-out, a word's required letters and marks, and the lesson order are computed from the spelling. Do not store them.
- **Learner state is separate from content** and keeps its shape (`LearnerState` in `src/lib/storage.ts`). Card ids are `letter:<id>`, `mark:<id>` and `word:<id>`; changing an id loses that card's progress.
- **Voice clips are the learner's data.** They are stored on the device by card id (`src/lib/clips.ts`), apart from `LearnerState`. Never commit a recording, and never copy audio from another service without its owner's written permission.
- **Scheduler and question code take an injectable random source** so tests are repeatable. Keep it that way.
- **Licence.** Words from Wiktionary are CC BY-SA and the app must credit it. Do not copy from the Sureth Dictionary, SargonSays or the Lishani books; they are for checking only.

## Style

- Interface copy is in Australian English ("Practise now", "licence" as the noun), plain and short.
- Linguistic claims in the interface (letter names, what a mark does) need a source or a fluent reader's confirmation. `SPEC.md` lists the ones still unconfirmed.
