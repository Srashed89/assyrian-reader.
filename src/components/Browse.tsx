import type { CardId, Mark } from '../types';
import { categories, letters, marks, words } from '../content';
import type { LearnerState } from '../lib/storage';
import { Pip, Sy, WordRow } from './Bits';
import { VoiceCard } from './Voice';

/** The cards a recording session walks through, in the order each list shows them. */
export const LETTER_CARDS: CardId[] = letters.map((l) => `letter:${l.id}` as CardId);
export const WORD_CARDS: CardId[] = categories.flatMap((c) => words.filter((w) => w.category === c.id).map((w) => `word:${w.id}` as CardId));

export function LettersView({ state, onOpen, onRecord }: { state: LearnerState; onOpen: (letterId: string) => void; onRecord?: () => void }) {
  return (
    <>
      <p className="lead">
        There are 22 letters. Start at the top right and read to the left, the way the script runs. Tap a letter to see its shapes and its sound.
      </p>
      <div className="lgrid">
        {letters.map((l) => (
          <button className="ltile" type="button" key={l.id} aria-label={`${l.name}, ${l.sound}`} onClick={() => onOpen(l.id)}>
            <Sy>{l.char}</Sy>
            <span className="lname">{l.name}</span>
            <Pip card={state.cards[`letter:${l.id}`]} />
          </button>
        ))}
      </div>
      {onRecord && <VoiceCard ids={LETTER_CARDS} things="letters" onOpen={onRecord} />}
    </>
  );
}

function MarkRow({ mark }: { mark: Mark }) {
  return (
    <div className="row">
      <span>
        <span className="does">{mark.name}: {mark.effect}</span>
        <span className="d">{mark.note}</span>
      </span>
      <Sy>{mark.sample}</Sy>
    </div>
  );
}

export function MarksView() {
  return (
    <>
      <p className="lead">
        Letters give the consonants. These small marks give the vowels and tell you when a letter softens, goes silent or turns plural. Each is shown on Beth.
      </p>
      <p className="cat">Vowels</p>
      <div className="rows">{marks.filter((m) => m.group === 'vowel').map((m) => <MarkRow mark={m} key={m.id} />)}</div>
      <p className="cat">Other marks</p>
      <div className="rows">{marks.filter((m) => m.group === 'other').map((m) => <MarkRow mark={m} key={m.id} />)}</div>
    </>
  );
}

export function WordsView({ state, onOpen, onRecord }: { state: LearnerState; onOpen: (wordId: string) => void; onRecord?: () => void }) {
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
            {words.filter((w) => w.category === c.id).map((w) => (
              <WordRow key={w.id} word={w} say={state.mine[w.id] || w.reading} mine={!!state.mine[w.id]} flagged={!!state.flags[w.id]} onOpen={() => onOpen(w.id)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
