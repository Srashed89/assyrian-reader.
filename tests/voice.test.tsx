import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import type { CardId, Word } from '../src/types';
import { builtInVoice, ORDER } from '../src/content';
import { countRecorded, firstUnrecorded, packClips, unpackClips, type Clip } from '../src/lib/clips';
import { emptyState } from '../src/lib/storage';
import { LETTER_CARDS, LettersView, MARK_CARDS, MarksView, WORD_CARDS, WordsView } from '../src/components/Browse';
import { RecorderSheet, WordSheet } from '../src/components/Sheets';
import { HearButton, VoiceContext, type VoiceApi } from '../src/components/Voice';

const noop = () => {};
const say = (w: Word) => w.reading;

/** A stand-in voice: these cards have a clip, and the device may or may not be able to record. */
function voice(recorded: CardId[], canRecord = true, builtIn: CardId[] = []): VoiceApi {
  return { canRecord, count: recorded.length, reload: async () => {}, has: (id) => recorded.includes(id) || builtIn.includes(id), own: (id) => recorded.includes(id), play: noop, save: async () => {}, remove: async () => {} };
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

  it('covers every letter, mark and word, using the same card ids as practice', () => {
    expect(LETTER_CARDS).toHaveLength(22);
    expect(MARK_CARDS).toHaveLength(11);
    expect(WORD_CARDS).toHaveLength(46);
    expect([...LETTER_CARDS, ...MARK_CARDS, ...WORD_CARDS].sort()).toEqual([...ORDER].sort());
  });
});

describe('voice controls', () => {
  it('offers to play a card only when it has a clip', () => {
    expect(withVoice(voice([]), <HearButton id="word:shawra" />)).toBe('');
    expect(withVoice(voice(['word:shawra']), <HearButton id="word:shawra" />)).toContain('Hear it');
  });

  it('shows nothing about voice when the device cannot record and nothing is recorded', () => {
    const html = withVoice(voice([], false), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(html).not.toContain('>Voice<');
  });

  it('lets a word be recorded, then heard, re-recorded or deleted', () => {
    const before = withVoice(voice([]), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(before).toContain('>Voice<');
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

describe('the built-in voice', () => {
  it('has a sound file for every card but the letter E, whose clip was silent', () => {
    const missing = ORDER.filter((id) => !(id in builtInVoice.clips));
    expect(missing).toEqual(['letter:e']);
    expect(Object.keys(builtInVoice.clips).every((id) => ORDER.includes(id as CardId))).toBe(true);
  });

  it('points only at files that are in the app', () => {
    const inApp = Object.keys(import.meta.glob('../public/voice/**/*.mp3')).map((path) => path.replace('../public/', '')).sort();
    expect(Object.values(builtInVoice.clips).sort()).toEqual(inApp);
  });

  it('speaks until the learner records their own, and comes back when that is deleted', () => {
    const builtIn = withVoice(voice([], true, ['word:shawra']), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(builtIn).toContain('Hear it</button>');
    expect(builtIn).toContain('Record my own');
    expect(builtIn).toContain('This is the built-in voice');
    expect(builtIn).not.toContain('Delete my recording');
    const own = withVoice(voice(['word:shawra'], true, ['word:shawra']), <WordSheet wordId="shawra" state={emptyState()} onSave={noop} onClose={noop} />);
    expect(own).toContain('Record again');
    expect(own).toContain('Delete my recording');
    expect(own).not.toContain('This is the built-in voice');
  });

  it('does not count as the learner’s own recording', () => {
    const html = withVoice(voice(['word:malka'], true, ['word:shawra', 'word:malka']), <WordsView state={emptyState()} onOpen={noop} onRecord={noop} />);
    expect(html).toContain('1 of 46 recorded');
    expect(html.match(/class="spk"/g)).toHaveLength(2);
    const session = withVoice(voice([], true, ['word:shawra']), <RecorderSheet ids={['word:shawra', 'word:malka']} say={say} onClose={noop} />);
    expect(session).toContain('1 of 2');
    expect(session).toContain('Skip');
  });
});

describe('pressing to hear', () => {
  it('marks what will speak with a loudspeaker, and nothing else', () => {
    const none = withVoice(voice([]), <LettersView state={emptyState()} onOpen={noop} />);
    expect(none).not.toContain('class="spk"');
    const some = withVoice(voice(['letter:beth', 'letter:nun']), <LettersView state={emptyState()} onOpen={noop} />);
    expect(some.match(/class="spk"/g)).toHaveLength(2);
    expect(some.match(/class="ltile"/g)).toHaveLength(22);
    const words = withVoice(voice(['word:malka']), <WordsView state={emptyState()} onOpen={noop} />);
    expect(words.match(/class="spk"/g)).toHaveLength(1);
  });

  it('turns a recorded mark into something to press', () => {
    const html = withVoice(voice(['mark:pt']), <MarksView />);
    expect(html.match(/<button class="row"/g)).toHaveLength(1);
    expect(html.match(/class="row"/g)).toHaveLength(11);
  });
});

describe('a voice file', () => {
  const clip = (bytes: number[]): Clip => ({ type: 'audio/webm;codecs=opus', data: new Uint8Array(bytes).buffer });

  it('carries clips to another device unchanged', () => {
    const big = Array.from({ length: 70_000 }, (_, i) => i % 251);
    const back = unpackClips(packClips([['word:malka', clip([1, 2, 3, 255, 0])], ['letter:beth', clip(big)]]));
    expect(back.map(([id]) => id)).toEqual(['word:malka', 'letter:beth']);
    expect([...new Uint8Array(back[0]![1].data)]).toEqual([1, 2, 3, 255, 0]);
    expect([...new Uint8Array(back[1]![1].data)]).toEqual(big);
    expect(back[0]![1].type).toBe('audio/webm;codecs=opus');
  });

  it('drops anything that is not a sound clip for a card', () => {
    expect(unpackClips('not a file')).toEqual([]);
    expect(unpackClips('{"kind":"notes","clips":{}}')).toEqual([]);
    const text = JSON.stringify({ kind: 'voice', clips: {
      'word:malka': { type: 'audio/mp4', data: 'AQID' },
      'settings:theme': { type: 'audio/mp4', data: 'AQID' },
      'word:bad-type': { type: 'text/html', data: 'AQID' },
      'word:bad-data': { type: 'audio/mp4', data: '%%%' },
      'word:empty': { type: 'audio/mp4', data: '' },
    } });
    expect(unpackClips(text).map(([id]) => id)).toEqual(['word:malka']);
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

  it('prompts a letter by its name and sound, and a mark by its name and what it gives', () => {
    const letter = withVoice(voice([]), <RecorderSheet ids={['letter:beth']} say={say} onClose={noop} />);
    expect(letter).toContain('Say this letter');
    expect(letter).toContain('Beth');
    const mark = withVoice(voice([]), <RecorderSheet ids={['mark:pt']} say={say} onClose={noop} />);
    expect(mark).toContain('Say this mark');
    expect(mark).toContain('Pthaha');
    expect(mark).toContain('Copy the mark');
  });
});
