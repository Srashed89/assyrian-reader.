import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { CardId, Word } from '../types';
import { letterById, markById, parseCard, wordById, words } from '../content';
import { firstUnrecorded } from '../lib/clips';
import { clusters, TATWEEL } from '../lib/script';
import type { LearnerState } from '../lib/storage';
import { Breakdown, CopyButton, Sy, WordRow } from './Bits';
import { HearButton, RecordButton, useVoice, VoicePanel } from './Voice';

/** A panel that slides over the page from the bottom. Closes on Escape or a tap outside. */
export function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  // Keep the latest onClose without re-running the effect, so focus is only moved when the sheet opens and closes.
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="top">
          <div>
            <h2 id="sheet-title">{title}</h2>
            {sub && <p className="sub">{sub}</p>}
          </div>
          <button className="x" type="button" ref={close} onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LetterSheet({ letterId, state, onClose }: { letterId: string; state: LearnerState; onClose: () => void }) {
  const L = letterById.get(letterId);
  if (!L) return null;
  const forms: [string, string][] =
    L.joins === 'both'
      ? [[L.char, 'alone'], [L.char + TATWEEL, 'start'], [TATWEEL + L.char + TATWEEL, 'middle'], [TATWEEL + L.char, 'end']]
      : [[L.char, 'alone'], [TATWEEL + L.char, 'after a letter']];
  const examples = words.filter((w) => clusters(w.script).some((c) => c.base === L.char)).slice(0, 3);
  return (
    <Sheet title={L.name} sub={`Sound: ${L.sound}`} onClose={onClose}>
      <div className="sy hero" lang="syr" dir="rtl">{L.char}</div>
      <p>{L.note}</p>
      <VoicePanel id={`letter:${L.id}`} />
      <p className="cat">Shapes in a word</p>
      <div className="forms">
        {forms.map(([form, label]) => (
          <div className="form" key={label}><Sy>{form}</Sy><small>{label}</small></div>
        ))}
      </div>
      {L.joins === 'right' && <p className="hint">This letter never joins to the letter after it, so a small gap follows it inside a word.</p>}
      {L.variants.length > 0 && (
        <>
          <p className="cat">With a mark</p>
          <div className="forms">
            {L.variants.map((v) => (
              <div className="form" key={v.form}><Sy>{v.form}</Sy><small>{v.sound}</small></div>
            ))}
          </div>
        </>
      )}
      {examples.length > 0 && (
        <>
          <p className="cat">Words you know</p>
          <div className="rows">
            {examples.map((w) => <WordRow key={w.id} word={w} say={state.mine[w.id] || w.reading} />)}
          </div>
        </>
      )}
    </Sheet>
  );
}

export function WordSheet({ wordId, state, onSave, onClose }: {
  wordId: string;
  state: LearnerState;
  onSave: (wordId: string, mine: string, flagged: boolean) => void;
  onClose: () => void;
}) {
  const w = wordById.get(wordId);
  const [mine, setMine] = useState(state.mine[wordId] ?? '');
  const [flagged, setFlagged] = useState(!!state.flags[wordId]);
  const [saved, setSaved] = useState(false);
  if (!w) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(wordId, mine, flagged);
    setSaved(true);
  };
  return (
    <Sheet title={state.mine[wordId] || w.reading} sub={w.english} onClose={onClose}>
      <div className="sy hero" lang="syr" dir="rtl">{w.script}</div>
      <p>Written standard: <span className="tl">{w.translit}</span></p>
      <VoicePanel id={`word:${w.id}`} />
      <p className="cat">Letter by letter</p>
      <Breakdown script={w.script} />
      <p className="hint">Read the boxes from right to left, the way the word is written.</p>
      <form className="field" onSubmit={submit}>
        <label htmlFor="mine-input">How you say it</label>
        <input
          type="text" id="mine-input" value={mine} placeholder={w.reading} maxLength={60}
          autoComplete="off" autoCapitalize="off" spellCheck={false}
          onChange={(e) => { setMine(e.target.value); setSaved(false); }}
        />
        <label className="check" htmlFor="flag-input">
          <input
            type="checkbox" id="flag-input" checked={flagged}
            onChange={(e) => { setFlagged(e.target.checked); onSave(wordId, mine, e.target.checked); setSaved(true); }}
          />
          This spelling looks wrong to me
        </label>
        <div className="btnrow">
          <button className="btn primary" type="submit">Save</button>
          <span className="hint" aria-live="polite">{saved ? 'Saved.' : ''}</span>
        </div>
      </form>
    </Sheet>
  );
}

/**
 * A recording session: one card at a time, prompted in English, so the learner can record
 * words they say but cannot yet read. Opens at the first card that has no clip.
 */
export function RecorderSheet({ ids, say, onClose }: { ids: readonly CardId[]; say: (w: Word) => string; onClose: () => void }) {
  const voice = useVoice();
  const [index, setIndex] = useState(() => firstUnrecorded(ids, voice.own));
  const id = ids[index];
  if (!id) return null;
  const { kind, key } = parseCard(id);
  const letter = kind === 'letter' ? letterById.get(key) : undefined;
  const mark = kind === 'mark' ? markById.get(key) : undefined;
  const word = kind === 'word' ? wordById.get(key) : undefined;
  // What to show for this card: an English prompt, a hint, and the script it is written in.
  const card = word ? { thing: 'word', big: word.english, hint: 'You say', small: say(word), script: word.script }
    : letter ? { thing: 'letter', big: letter.name, hint: 'Sound', small: letter.sound, script: letter.char }
    : mark ? { thing: 'mark', big: mark.name, hint: 'It gives', small: mark.effect, script: mark.sample }
    : null;
  if (!card) return null;
  const last = index === ids.length - 1;
  return (
    <Sheet title={`Say this ${card.thing}`} sub={`${index + 1} of ${ids.length}`} onClose={onClose}>
      <p className="sayit">{card.big}</p>
      <p className="saysub">{card.hint}: <b>{card.small}</b></p>
      <div className="sy hero" lang="syr" dir="rtl">{card.script}</div>
      <div className="btnrow">
        <RecordButton id={id} key={id} />
        <HearButton id={id} />
      </div>
      <div className="btnrow">
        <CopyButton key={id} text={card.script} label={`Copy the ${card.thing}`} />
      </div>
      <div className="btnrow">
        <button className="btn quiet" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
        {last
          ? <button className="btn primary" type="button" onClick={onClose}>Finish</button>
          : <button className="btn primary" type="button" onClick={() => setIndex(index + 1)}>{voice.own(id) ? 'Next' : 'Skip'}</button>}
      </div>
    </Sheet>
  );
}
