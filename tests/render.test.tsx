import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ORDER, words } from '../src/content';
import { buildRound, grade, requeue } from '../src/lib/scheduler';
import { makeQuestion } from '../src/lib/questions';
import { emptyState } from '../src/lib/storage';
import { LettersView, MarksView, WordsView } from '../src/components/Browse';
import { LetterSheet, WordSheet } from '../src/components/Sheets';
import { PracticeView, type Session } from '../src/components/Practice';
import type { Word } from '../src/types';

const say = (w: Word) => w.reading;
const noop = () => {};
const NOW = 1_800_000_000_000;

describe('screens render', () => {
  it('shows all 22 letters, right to left', () => {
    const html = renderToStaticMarkup(<LettersView state={emptyState()} onOpen={noop} />);
    expect(html.match(/class="ltile"/g)).toHaveLength(22);
    expect(html).toContain('lang="syr" dir="rtl"');
  });

  it('shows all 11 marks and all 46 words', () => {
    expect(renderToStaticMarkup(<MarksView />).match(/class="row"/g)).toHaveLength(11);
    expect(renderToStaticMarkup(<WordsView state={emptyState()} onOpen={noop} />).match(/class="row"/g)).toHaveLength(46);
  });

  it('shows the learner’s own reading in the word list', () => {
    const state = { ...emptyState(), mine: { yawma: 'yoma' } };
    const html = renderToStaticMarkup(<WordsView state={state} onOpen={noop} />);
    expect(html).toContain('yoma');
    expect(html).toContain('YOURS');
  });

  it('opens a letter and a word', () => {
    const letter = renderToStaticMarkup(<LetterSheet letterId="beth" state={emptyState()} onClose={noop} />);
    expect(letter).toContain('Sound: b');
    expect(letter.match(/class="form"/g)).toHaveLength(5); // four joined shapes and one marked variant
    const word = renderToStaticMarkup(<WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(word).toContain('šaḇrā');
    expect(word.match(/class="cell"/g)).toHaveLength(4);
  });
});

describe('a practice round', () => {
  it('renders the start card, every card of a round, and the summary', () => {
    const start = renderToStaticMarkup(<PracticeView session={null} due={0} notMet={79} say={say} onStart={noop} onGotIt={noop} onAnswer={noop} onNext={noop} />);
    expect(start).toContain('Start a round');

    // Play a whole round the way the app does, missing every third question.
    let cards = {} as ReturnType<typeof emptyState>['cards'];
    const built = buildRound(ORDER, cards, NOW);
    let s: Session = { queue: built.queue, index: 0, asked: 0, right: 0, fresh: built.fresh, done: false, question: null, answered: null };
    let guard = 0;
    while (s.index < s.queue.length && guard++ < 100) {
      const item = s.queue[s.index]!;
      if (item.intro) {
        expect(renderToStaticMarkup(<PracticeView session={s} due={0} notMet={0} say={say} onStart={noop} onGotIt={noop} onAnswer={noop} onNext={noop} />)).toContain('Got it');
      } else {
        const question = makeQuestion(item.id, cards[item.id]?.box ?? 0, say);
        s = { ...s, question, answered: null };
        expect(renderToStaticMarkup(<PracticeView session={s} due={0} notMet={0} say={say} onStart={noop} onGotIt={noop} onAnswer={noop} onNext={noop} />).match(/class="opt"/g)).toHaveLength(4);
        const ok = s.asked % 3 !== 2;
        const picked = ok ? question.correct : (question.correct + 1) % 4;
        cards = { ...cards, [item.id]: grade(cards[item.id], ok, !!item.retry, NOW) };
        s = { ...s, queue: ok ? s.queue : requeue(s.queue, s.index, item.id), asked: s.asked + 1, right: s.right + (ok ? 1 : 0), answered: picked };
        const after = renderToStaticMarkup(<PracticeView session={s} due={0} notMet={0} say={say} onStart={noop} onGotIt={noop} onAnswer={noop} onNext={noop} />);
        expect(after).toContain(ok ? 'Right.' : 'Not this time.');
        expect(after).toContain('opt right');
      }
      s = { ...s, index: s.index + 1 };
    }
    expect(s.asked).toBeGreaterThanOrEqual(8);
    expect(Object.keys(cards)).toHaveLength(4);
    // A new card can be answered at most twice for credit in one round, so no card is past box 2.
    expect(Object.values(cards).every((c) => c.box === 1 || c.box === 2)).toBe(true);

    const done = renderToStaticMarkup(<PracticeView session={{ ...s, done: true }} due={0} notMet={0} say={say} onStart={noop} onGotIt={noop} onAnswer={noop} onNext={noop} />);
    expect(done).toContain('Round finished.');
    expect(words.length).toBe(46);
  });
});
