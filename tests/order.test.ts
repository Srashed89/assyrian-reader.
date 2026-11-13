import { describe, expect, it } from 'vitest';
import { letters, marks, words, ORDER } from '../src/content';
import { buildOrder, requirements } from '../src/lib/order';

describe('lesson order', () => {
  it('includes every card exactly once', () => {
    const all = [
      ...letters.map((l) => `letter:${l.id}`),
      ...marks.map((m) => `mark:${m.id}`),
      ...words.map((w) => `word:${w.id}`),
    ];
    expect(new Set(ORDER).size).toBe(ORDER.length);
    expect([...ORDER].sort()).toEqual(all.sort());
  });

  it('introduces every letter and mark a word needs before the word', () => {
    for (const w of words) {
      const at = ORDER.indexOf(`word:${w.id}`);
      for (const r of requirements(w, letters)) expect(ORDER.indexOf(r), `${w.id} needs ${r}`).toBeLessThan(at);
    }
  });

  it('reaches the first word after two letters and one mark', () => {
    expect(ORDER.slice(0, 9)).toEqual([
      'letter:alap', 'letter:nun', 'mark:zq', 'word:ana',
      'letter:beth', 'word:baba',
      'letter:kheth', 'mark:pt', 'word:akhnan',
    ]);
  });

  it('is the same every time', () => {
    expect(buildOrder(letters, marks, words)).toEqual(ORDER);
  });

  it('puts letters and marks no word uses at the end', () => {
    const lastWord = Math.max(...words.map((w) => ORDER.indexOf(`word:${w.id}`)));
    expect(ORDER.indexOf('mark:mj')).toBeGreaterThan(lastWord);
    expect(ORDER.indexOf('letter:sadhe')).toBeGreaterThan(lastWord);
  });
});
