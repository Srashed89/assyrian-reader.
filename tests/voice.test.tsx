import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { CardId, Word } from '../src/types';
import { ORDER } from '../src/content';
import { countRecorded, firstUnrecorded } from '../src/lib/clips';
import { emptyState } from '../src/lib/storage';
import { LETTER_CARDS, WORD_CARDS, WordsView } from '../src/components/Browse';
import { RecorderSheet, WordSheet } from '../src/components/Sheets';
import { HearButton, VoiceContext, type VoiceApi } from '../src/components/Voice';

const noop = () => {};
const say = (w: Word) => w.reading;

/** A stand-in voice: these cards have a clip, and the device may or may not be able to record. */
function voice(recorded: CardId[], canRecord = true): VoiceApi {
  return { canRecord, has: (id) => recorded.includes(id), play: noop, save: async () => {}, remove: async () => {} };
}
const withVoice = (api: VoiceApi, node: ReactNode) => renderToStaticMarkup(<VoiceContext.Provider value={api}>{node}</VoiceContext.Provider>);

describe('recording order', () => {
  const ids: CardId[] = ['word:a', 'word:b', 'word:c'];

  it('opens at the first card with no clip', () => {
    expect(firstUnrecorded(ids, () => false)).toBe(0);
    expect(firstUnrecorded(ids, (id) => id === 'word:a')).toBe(1);
    expect(firstUnrecorded(ids, (id) => id !== 'word:c')).toBe(2);
  });

  it('goes back to the start once every card has a clip', () => {
    expect(firstUnrecorded(ids, () => true)).toBe(0);
  });

  it('counts the clips recorded', () => {
    expect(countRecorded(ids, () => false)).toBe(0);
    expect(countRecorded(ids, (id) => id !== 'word:b')).toBe(2);
  });

  it('covers every letter and every word, using the same card ids as practice', () => {
    expect(LETTER_CARDS).toHaveLength(22);
    expect(WORD_CARDS).toHaveLength(46);
    expect([...LETTER_CARDS, ...WORD_CARDS].every((id) => ORDER.includes(id))).toBe(true);
  });
});

describe('voice controls', () => {
  it('offers to play a card only when it has a clip', () => {
    expect(withVoice(voice([]), <HearButton id="word:shawra" />)).toBe('');
    expect(withVoice(voice(['word:shawra']), <HearButton id="word:shawra" />)).toContain('Hear it');
  });

  it('shows nothing about voice when the device cannot record and nothing is recorded', () => {
    const html = withVoice(voice([], false), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(html).not.toContain('Your voice');
  });

  it('lets a word be recorded, then heard, re-recorded or deleted', () => {
    const before = withVoice(voice([]), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(before).toContain('Your voice');
    expect(before).toContain('Record');
    expect(before).not.toContain('Hear it</button>');
    const after = withVoice(voice(['word:shawra']), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(after).toContain('Hear it</button>');
    expect(after).toContain('Record again');
    expect(after).toContain('Delete');
  });

  it('counts recorded words at the top of the word list', () => {
    const html = withVoice(voice(['word:shawra', 'word:malka']), <WordsView state={emptyState()} onOpen={noop} onRecord={noop} />);
    expect(html).toContain('2 of 46 recorded');
    expect(html).toContain('Keep recording');
    expect(html.match(/class="row"/g)).toHaveLength(46);
  });
});

describe('a recording session', () => {
  it('prompts in English and shows the learner’s own reading', () => {
    const html = withVoice(voice([]), <RecorderSheet ids={['word:shawra', 'word:malka']} say={() => 'shora'} onClose={noop} />);
    expect(html).toContain('Say this word');
    expect(html).toContain('1 of 2');
    expect(html).toContain('child');
    expect(html).toContain('shora');
    expect(html).toContain('Skip');
    expect(html).toContain('Copy the word');
  });

  it('opens at the first word not yet recorded', () => {
    const html = withVoice(voice(['word:shawra']), <RecorderSheet ids={['word:shawra', 'word:malka']} say={say} onClose={noop} />);
    expect(html).toContain('2 of 2');
    expect(html).toContain('king');
    expect(html).toContain('Finish');
  });

  it('prompts a letter by its name and sound', () => {
    const html = withVoice(voice([]), <RecorderSheet ids={['letter:beth']} say={say} onClose={noop} />);
    expect(html).toContain('Say this letter');
    expect(html).toContain('Beth');
  });
});
