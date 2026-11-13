import { describe, expect, it } from 'vitest';
import type { CardId } from '../src/types';
import { buildRound, grade, INTERVALS_MS, progress, requeue, type Cards } from '../src/lib/scheduler';
import { exportNotes, sanitise } from '../src/lib/storage';
import { makeQuestion } from '../src/lib/questions';
import { ORDER, words } from '../src/content';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

/** A repeatable random source, so the tests do not depend on luck. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('grading', () => {
  it('moves a right answer up one box and schedules it', () => {
    expect(grade(undefined, true, false, NOW)).toEqual({ box: 1, due: NOW + 10 * 60_000, seen: 1 });
    expect(grade({ box: 2, due: 0, seen: 3 }, true, false, NOW)).toEqual({ box: 3, due: NOW + 3 * DAY, seen: 4 });
  });

  it('never goes above box 5', () => {
    expect(grade({ box: 5, due: 0, seen: 9 }, true, false, NOW).box).toBe(5);
  });

  it('sends a wrong answer back to box 1', () => {
    expect(grade({ box: 4, due: 0, seen: 6 }, false, false, NOW)).toEqual({ box: 1, due: NOW + 10 * 60_000, seen: 7 });
  });

  it('does not promote a right answer on a repeat', () => {
    expect(grade({ box: 1, due: 0, seen: 2 }, true, true, NOW).box).toBe(1);
  });

  it('waits 10 minutes, then 1, 3, 7 and 21 days', () => {
    expect(INTERVALS_MS.slice(1)).toEqual([10 * 60_000, DAY, 3 * DAY, 7 * DAY, 21 * DAY]);
  });
});

describe('building a round', () => {
  it('starts a new learner with four new cards, introduced in pairs', () => {
    const { queue, fresh } = buildRound(ORDER, {}, NOW, seeded(1));
    expect(fresh).toBe(4);
    const [a, b, c, d] = ORDER;
    expect(queue.slice(0, 8)).toEqual([
      { id: a, intro: true }, { id: b, intro: true }, { id: a }, { id: b },
      { id: c, intro: true }, { id: d, intro: true }, { id: c }, { id: d },
    ]);
  });

  it('never tests a new card before introducing it', () => {
    const { queue } = buildRound(ORDER, {}, NOW, seeded(2));
    const introduced = new Set<CardId>();
    for (const q of queue) {
      if (q.intro) introduced.add(q.id);
      else expect(introduced.has(q.id)).toBe(true);
    }
  });

  it('puts due cards in, lowest box first', () => {
    const cards: Cards = {
      [ORDER[0]!]: { box: 3, due: NOW - 1, seen: 3 },
      [ORDER[1]!]: { box: 1, due: NOW - 1, seen: 1 },
      [ORDER[2]!]: { box: 2, due: NOW + DAY, seen: 2 },
    };
    const { queue } = buildRound(ORDER, cards, NOW, seeded(3));
    const reviews = queue.filter((q) => !q.intro && !q.again && cards[q.id]).map((q) => q.id);
    expect(reviews).toEqual([ORDER[1], ORDER[0]]);
  });

  it('adds no new cards when ten reviews are due', () => {
    const cards: Cards = {};
    ORDER.slice(0, 12).forEach((id) => { cards[id] = { box: 1, due: NOW - 1, seen: 1 }; });
    const { queue, fresh } = buildRound(ORDER, cards, NOW, seeded(4));
    expect(fresh).toBe(0);
    expect(queue).toHaveLength(10);
    expect(queue.some((q) => q.intro)).toBe(false);
  });

  it('asks about ten questions when there is enough to ask', () => {
    const cards: Cards = {};
    ORDER.slice(0, 20).forEach((id) => { cards[id] = { box: 2, due: NOW + DAY, seen: 2 }; });
    const { queue } = buildRound(ORDER, cards, NOW, seeded(5));
    expect(queue.filter((q) => !q.intro)).toHaveLength(10);
  });

  it('brings a missed card back three cards later', () => {
    const queue = ORDER.slice(0, 6).map((id) => ({ id }));
    const next = requeue(queue, 1, ORDER[1]!);
    expect(next).toHaveLength(7);
    expect(next[4]).toEqual({ id: ORDER[1], retry: true });
    expect(requeue(queue, 5, ORDER[5]!)[6]).toEqual({ id: ORDER[5], retry: true });
  });

  it('counts progress', () => {
    const cards: Cards = {
      [ORDER[0]!]: { box: 4, due: NOW + DAY, seen: 5 },
      [ORDER[1]!]: { box: 1, due: NOW - 1, seen: 1 },
    };
    expect(progress(ORDER, cards, NOW)).toEqual({ total: 79, started: 2, knownWell: 1, due: 1, notMet: 77 });
  });
});

describe('questions', () => {
  const say = (w: { reading: string }) => w.reading;

  it('always offers four different options with the right one among them', () => {
    const rng = seeded(7);
    for (const id of ORDER) {
      for (const box of [0, 1, 3]) {
        const q = makeQuestion(id, box, say, rng);
        expect(q.options, id).toHaveLength(4);
        expect(new Set(q.options).size, id).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
      }
    }
  });

  it('offers Resh when asking about Dalath', () => {
    const q = makeQuestion('letter:dalath', 0, say, seeded(8));
    expect(q.options.some((o) => o.startsWith('Resh'))).toBe(true);
    expect(q.options[q.correct]).toBe('Dalath, d');
  });

  it('uses the learner’s own reading where one is saved', () => {
    const q = makeQuestion('word:yawma', 0, (w) => (w.id === 'yawma' ? 'yoma' : w.reading), seeded(9));
    expect(q.options[q.correct]).toBe('yoma · day');
  });

  it('does not ask a reverse question about a card not yet met', () => {
    const rng = seeded(10);
    for (let i = 0; i < 40; i++) expect(makeQuestion('word:baba', 0, say, rng).glyphOptions).toBe(false);
  });
});

describe('learner state', () => {
  it('drops anything malformed', () => {
    const s = sanitise({ rev: 4, cards: { 'word:ana': { box: 9, due: 5, seen: 2 }, bad: 'x' }, mine: { ana: '  ana  ', x: 3 }, flags: { ana: 1, baba: 0 } });
    expect(s).toEqual({ v: 1, rev: 4, cards: { 'word:ana': { box: 5, due: 5, seen: 2 } }, mine: { ana: 'ana' }, flags: { ana: true } });
    expect(sanitise(null)).toEqual({ v: 1, rev: 0, cards: {}, mine: {}, flags: {} });
  });

  it('exports saved readings and flags', () => {
    const out = JSON.parse(exportNotes({ v: 1, rev: 1, cards: {}, mine: { yawma: 'yoma' }, flags: { keka: true } }, words, '2026-11-13'));
    expect(out.exported).toBe('2026-11-13');
    expect(out.pronunciations).toEqual([{ id: 'yawma', script: 'ܝܵܘܡܵܐ', standard: 'yāwmā', mine: 'yoma' }]);
    expect(out.flaggedSpellings).toEqual([{ id: 'keka', script: 'ܟܹܟܵܐ', standard: 'kēkā' }]);
  });
});
