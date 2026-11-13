import type { CardId, Letter, Mark, Word } from '../types';
import { letters, marks, words, letterById, markById, wordById, parseCard } from '../content';
import { clusters } from './script';
import { shuffle, type Rng } from './scheduler';

export interface Question {
  id: CardId;
  /** Script shown above the question, if any. */
  prompt?: string;
  ask: string;
  options: string[];
  /** True when the options are script rather than text. */
  glyphOptions: boolean;
  correct: number;
}

/** Letters that are easy to mistake for one another. */
export const LOOK_ALIKE: Record<string, string> = {
  'ܕ': 'ܪ', 'ܪ': 'ܕ', 'ܒ': 'ܟ', 'ܟ': 'ܒ', 'ܘ': 'ܩ', 'ܩ': 'ܘ', 'ܥ': 'ܠ', 'ܠ': 'ܥ', 'ܢ': 'ܝ', 'ܝ': 'ܢ',
};

function others<T>(pool: T[], target: T, n: number, prefer: T[], rng: Rng): T[] {
  const out = prefer.filter((x) => x !== target).slice(0, n);
  const rest = shuffle(pool.filter((x) => x !== target && !out.includes(x)), rng);
  while (out.length < n && rest.length) out.push(rest.pop()!);
  return out;
}

const firstLetter = (w: Word) => clusters(w.script)[0]?.base;

/**
 * Build a four-option question for a card.
 * `box` is the card's current box; the reverse question types only appear once a card has been met.
 * `say` gives the learner's own reading of a word where they have saved one.
 */
export function makeQuestion(id: CardId, box: number, say: (w: Word) => string, rng: Rng = Math.random): Question {
  const { kind, key } = parseCard(id);

  if (kind === 'letter') {
    const L = letterById.get(key) as Letter;
    const alike = letters.filter((x) => x.char === LOOK_ALIKE[L.char]);
    const set = shuffle([L, ...others(letters, L, 3, alike, rng)], rng);
    if (box >= 1 && rng() < 0.35) {
      return { id, ask: `Which letter is ${L.name}, with the sound “${L.sound}”?`, glyphOptions: true, options: set.map((x) => x.char), correct: set.indexOf(L) };
    }
    return { id, prompt: L.char, ask: 'Which letter is this?', glyphOptions: false, options: set.map((x) => `${x.name}, ${x.sound}`), correct: set.indexOf(L) };
  }

  if (kind === 'mark') {
    const m = markById.get(key) as Mark;
    const set = shuffle([m, ...others(marks, m, 3, [], rng)], rng);
    return { id, prompt: m.sample, ask: 'What does this mark tell you?', glyphOptions: false, options: set.map((x) => x.effect), correct: set.indexOf(m) };
  }

  const w = wordById.get(key) as Word;
  const near = shuffle(words.filter((x) => x !== w && firstLetter(x) === firstLetter(w)), rng);
  const set = shuffle([w, ...others(words, w, 3, near, rng)], rng);
  if (box >= 2 && rng() < 0.4) {
    return { id, ask: `Find the word: ${say(w)} (${w.english})`, glyphOptions: true, options: set.map((x) => x.script), correct: set.indexOf(w) };
  }
  return { id, prompt: w.script, ask: 'Which word is this?', glyphOptions: false, options: set.map((x) => `${say(x)} · ${x.english}`), correct: set.indexOf(w) };
}
