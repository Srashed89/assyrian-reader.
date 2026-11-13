import type { CardId, Letter, Mark, Word } from '../types';
import { clusters, marksIn } from './script';

/** The letter and mark cards a word needs before it can be read. */
export function requirements(word: Word, letters: Letter[]): CardId[] {
  const idByChar = new Map(letters.map((l) => [l.char, l.id]));
  const out: CardId[] = [];
  for (const c of clusters(word.script)) {
    const id = idByChar.get(c.base);
    const card: CardId = `letter:${id}`;
    if (id && !out.includes(card)) out.push(card);
  }
  for (const m of marksIn(word.script)) out.push(`mark:${m}`);
  return out;
}

/**
 * Lesson order. Repeatedly pick the word that needs the fewest items not yet introduced,
 * introduce those letters and marks, then the word. Letters and marks no word uses go last.
 */
export function buildOrder(letters: Letter[], marks: Mark[], words: Word[]): CardId[] {
  const order: CardId[] = [];
  const seen = new Set<CardId>();
  const push = (id: CardId) => {
    if (!seen.has(id)) { seen.add(id); order.push(id); }
  };
  const left = words.map((w) => ({ word: w, req: requirements(w, letters) }));
  while (left.length) {
    let best = 0;
    let bestMissing = Infinity;
    left.forEach((n, i) => {
      const missing = n.req.filter((r) => !seen.has(r)).length;
      if (missing < bestMissing) { bestMissing = missing; best = i; }
    });
    const [next] = left.splice(best, 1);
    next!.req.forEach(push);
    push(`word:${next!.word.id}`);
  }
  letters.forEach((l) => push(`letter:${l.id}`));
  marks.forEach((m) => push(`mark:${m.id}`));
  return order;
}
