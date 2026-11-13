import type { Word } from '../types';
import { nameOf } from '../content';
import { soundOut } from '../lib/script';
import type { CardState } from '../lib/scheduler';
import { KNOWN_WELL_BOX } from '../lib/scheduler';

/**
 * A run of Assyrian script. Every piece of script in the app goes through this component,
 * so direction, language and font are always set. Never wrap part of a word in its own
 * element: styling inside a word can break the joins between letters.
 */
export function Sy({ children, className }: { children: string; className?: string }) {
  return (
    <span className={className ? `sy ${className}` : 'sy'} lang="syr" dir="rtl">
      {children}
    </span>
  );
}

/** A word sounded out letter by letter, right to left. */
export function Breakdown({ script }: { script: string }) {
  return (
    <div className="bk">
      {soundOut(script, nameOf).map((c, i) => (
        <div className="cell" key={i}>
          <Sy>{c.glyph}</Sy>
          <span className="snd">{c.sound}</span>
          <span className="nm">{c.parts.join(' + ')}</span>
        </div>
      ))}
    </div>
  );
}

export function Pip({ card }: { card: CardState | undefined }) {
  const cls = !card ? 'pip' : card.box >= KNOWN_WELL_BOX ? 'pip m' : 'pip s';
  return <span className={cls} aria-hidden="true" />;
}

export function WordRow({ word, say, mine, flagged, onOpen }: { word: Word; say: string; mine?: boolean; flagged?: boolean; onOpen?: () => void }) {
  const body = (
    <>
      <span>
        <span className="say">{say}</span>
        {mine && <span className="tagged">YOURS</span>}
        {flagged && <span className="tagged">FLAGGED</span>}
        <span className="en">{word.english}</span>
      </span>
      <Sy>{word.script}</Sy>
    </>
  );
  return onOpen ? (
    <button className="row" type="button" onClick={onOpen}>{body}</button>
  ) : (
    <div className="row">{body}</div>
  );
}
