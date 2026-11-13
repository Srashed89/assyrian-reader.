import type { CardId, Mark } from '../types';
import { categories, letters, marks, words } from '../content';
import type { LearnerState } from '../lib/storage';
import { Pip, Sy, WordRow } from './Bits';
import { Speaker } from './Decor';
import { useVoice, VoiceCard } from './Voice';

/** The cards a recording session walks through, in the order each list shows them. */
export const LETTER_CARDS: CardId[] = letters.map((l) => `letter:${l.id}` as CardId);
export const MARK_CARDS: CardId[] = (['vowel', 'other'] as const).flatMap((g) => marks.filter((m) => m.group === g).map((m) => `mark:${m.id}` as CardId));
export const WORD_CARDS: CardId[] = categories.flatMap((c) => words.filter((w) => w.category === c.id).map((w) => `word:${w.id}` as CardId));

/** Pressing a letter, mark or word says it, when the learner has recorded it. */
export function LettersView({ state, onOpen, onRecord }: { state: LearnerState; onOpen: (letterId: string) => void; onRecord?: () => void }) {
  const voice = useVoice();
  return (
    <>
      <p className="lead">
        There are 22 letters. Start at the top right and read to the left, the way the script runs. Tap a letter to see its shapes and its sound.
      </p>
      <div className="lgrid">
        {letters.map((l) => {
          const card: CardId = `letter:${l.id}`;
          return (
            <button className="ltile" type="button" key={l.id} aria-label={`${l.name}, ${l.sound}`} onClick={() => { voice.play(card); onOpen(l.id); }}>
              <Sy>{l.char}</Sy>
              <span className="lname">{l.name}</span>
              <Pip card={state.cards[card]} />
              {voice.has(card) && <span className="spk"><Speaker /></span>}
            </button>
          );
        })}
      </div>
      {onRecord && <VoiceCard ids={LETTER_CARDS} things="letters" onOpen={onRecord} />}
    </>
  );
}

function MarkRow({ mark }: { mark: Mark }) {
  const voice = useVoice();
  const card: CardId = `mark:${mark.id}`;
  const spoken = voice.has(card);
  const body = (
    <>
      <span>
        <span className="does">{spoken && <span className="spk"><Speaker /></span>}{mark.name}: {mark.effect}</span>
        <span className="d">{mark.note}</span>
      </span>
      <Sy>{mark.sample}</Sy>
    </>
  );
  return spoken
    ? <button className="row" type="button" onClick={() => voice.play(card)}>{body}</button>
    : <div className="row">{body}</div>;
}

export function MarksView({ onRecord }: { onRecord?: () => void }) {
  return (
    <>
      <p className="lead">
        Letters give the consonants. These small marks give the vowels and tell you when a letter softens, goes silent or turns plural. Each is shown on Beth.
      </p>
      {onRecord && <VoiceCard ids={MARK_CARDS} things="marks" onOpen={onRecord} />}
      <p className="cat">Vowels</p>
      <div className="rows">{marks.filter((m) => m.group === 'vowel').map((m) => <MarkRow mark={m} key={m.id} />)}</div>
      <p className="cat">Other marks</p>
      <div className="rows">{marks.filter((m) => m.group === 'other').map((m) => <MarkRow mark={m} key={m.id} />)}</div>
    </>
  );
}

export function WordsView({ state, onOpen, onRecord }: { state: LearnerState; onOpen: (wordId: string) => void; onRecord?: () => void }) {
  const voice = useVoice();
  return (
    <>
      <p className="lead">
        {words.length} words you already know by ear. Tap a word to sound it out letter by letter, and to save how your family says it.
      </p>
      {onRecord && <VoiceCard ids={WORD_CARDS} things="words" onOpen={onRecord} />}
      {categories.map((c) => (
        <div key={c.id} style={{ display: 'grid', gap: 14 }}>
          <p className="cat">{c.label}</p>
          <div className="rows">
            {words.filter((w) => w.category === c.id).map((w) => {
              const card: CardId = `word:${w.id}`;
              return (
                <WordRow
                  key={w.id} word={w} say={state.mine[w.id] || w.reading} mine={!!state.mine[w.id]} flagged={!!state.flags[w.id]}
                  spoken={voice.has(card)} onOpen={() => { voice.play(card); onOpen(w.id); }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
