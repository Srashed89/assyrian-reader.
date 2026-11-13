import type { CardId, Word } from '../types';
import { cardGlyph, letterById, markById, parseCard, wordById } from '../content';
import type { Question } from '../lib/questions';
import type { QueueItem } from '../lib/scheduler';
import { Breakdown, Sy } from './Bits';

export interface Session {
  queue: QueueItem[];
  index: number;
  asked: number;
  right: number;
  /** New cards met in this round. */
  fresh: number;
  done: boolean;
  /** The question for the current card, or null on an introduction card. */
  question: Question | null;
  /** The option the learner picked, or null while the question is open. */
  answered: number | null;
}

/** What a card is and how it works: shown when a card is introduced and after every answer. */
function Explain({ id, say }: { id: CardId; say: (w: Word) => string }) {
  const { kind, key } = parseCard(id);
  if (kind === 'letter') {
    const L = letterById.get(key);
    return L ? <p><b>{L.name}, {L.sound}. </b>{L.note}</p> : null;
  }
  if (kind === 'mark') {
    const m = markById.get(key);
    return m ? <p><b>{m.name}: {m.effect}. </b>{m.note}</p> : null;
  }
  const w = wordById.get(key);
  if (!w) return null;
  return (
    <>
      <p><b>{say(w)}</b> {'·'} {w.english} {'·'} <span className="tl">{w.translit}</span></p>
      <Breakdown script={w.script} />
      <p className="hint">Read the boxes from right to left.</p>
    </>
  );
}

function Meter({ session }: { session: Session }) {
  return (
    <div className="meter">
      <span>{session.asked} answered, {session.right} right</span>
      <span>{session.queue.length - session.index} to go</span>
    </div>
  );
}

export function PracticeView({ session, due, notMet, say, onStart, onGotIt, onAnswer, onNext }: {
  session: Session | null;
  due: number;
  notMet: number;
  say: (w: Word) => string;
  onStart: () => void;
  onGotIt: () => void;
  onAnswer: (option: number) => void;
  onNext: () => void;
}) {
  if (!session) {
    return (
      <section className="q">
        <p className="ask">Ten cards at a time.</p>
        <p className="lead">
          Each round introduces a few new letters or marks, then shows you a word you already say that uses only what you have met. Cards you miss come back sooner; cards you know wait longer.
        </p>
        <div className="stats">
          <div className="stat"><b>{due}</b><span>due for review</span></div>
          <div className="stat"><b>{notMet}</b><span>not met yet</span></div>
        </div>
        <div className="btnrow"><button className="btn primary" type="button" onClick={onStart}>Start a round</button></div>
      </section>
    );
  }

  if (session.done) {
    return (
      <section className="q">
        <p className="ask">Round finished.</p>
        <div className="stats">
          <div className="stat"><b>{session.right} / {session.asked}</b><span>answered right</span></div>
          <div className="stat"><b>{session.fresh}</b><span>new cards met</span></div>
        </div>
        <div className="btnrow">
          <button className="btn primary" type="button" onClick={onStart}>Another round</button>
          <a className="btn quiet" href="#words">Browse the words</a>
        </div>
      </section>
    );
  }

  const item = session.queue[session.index]!;

  if (item.intro) {
    const { kind } = parseCard(item.id);
    return (
      <section className="q" key={`intro-${session.index}`}>
        <Meter session={session} />
        <p className="new">{kind === 'letter' ? 'New letter' : kind === 'mark' ? 'New mark' : 'New word'}</p>
        <div className="prompt"><Sy>{cardGlyph(item.id)}</Sy></div>
        <Explain id={item.id} say={say} />
        <div className="btnrow"><button className="btn primary" type="button" autoFocus onClick={onGotIt}>Got it</button></div>
      </section>
    );
  }

  const q = session.question!;
  const answered = session.answered;
  const ok = answered === q.correct;
  return (
    <section className="q" key={`q-${session.index}`}>
      <Meter session={session} />
      {q.prompt && <div className="prompt"><Sy>{q.prompt}</Sy></div>}
      <p className="ask">{q.ask}</p>
      <div className={q.glyphOptions ? 'opts g' : 'opts'}>
        {q.options.map((o, i) => {
          const cls = answered === null ? 'opt' : i === q.correct ? 'opt right' : i === answered ? 'opt wrong' : 'opt';
          return (
            <button className={cls} type="button" key={i} disabled={answered !== null} onClick={() => onAnswer(i)}>
              {q.glyphOptions ? <Sy>{o}</Sy> : o}
            </button>
          );
        })}
      </div>
      {answered !== null && (
        <div className="fb" aria-live="polite">
          <p className={ok ? 'verdict ok' : 'verdict no'}>{ok ? 'Right.' : 'Not this time. It comes back shortly.'}</p>
          <Explain id={item.id} say={say} />
          <div className="btnrow"><button className="btn primary" type="button" autoFocus onClick={onNext}>Next</button></div>
        </div>
      )}
    </section>
  );
}
