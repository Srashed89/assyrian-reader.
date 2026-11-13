import { useCallback, useEffect, useRef, useState } from 'react';
import type { Word } from './types';
import { meta, ORDER, words } from './content';
import { buildRound, grade, progress, requeue } from './lib/scheduler';
import { makeQuestion } from './lib/questions';
import { emptyState, exportNotes, loadState, saveState, type LearnerState } from './lib/storage';
import { Sy } from './components/Bits';
import { Emblem, Star, TabIcon, Waves } from './components/Decor';
import { LETTER_CARDS, LettersView, MARK_CARDS, MarksView, WORD_CARDS, WordsView } from './components/Browse';
import { LetterSheet, RecorderSheet, WordSheet } from './components/Sheets';
import { VoiceFile, VoiceProvider } from './components/Voice';
import { PracticeView, type Session } from './components/Practice';

const VIEWS = ['letters', 'marks', 'words', 'practice'] as const;
type View = (typeof VIEWS)[number];
const LABEL: Record<View, string> = { letters: 'Letters', marks: 'Marks', words: 'Words', practice: 'Practice' };

function readHash(): View {
  const name = window.location.hash.slice(1);
  return (VIEWS as readonly string[]).includes(name) ? (name as View) : 'letters';
}

type SheetRef = { kind: 'letter' | 'word'; id: string } | { kind: 'record'; of: 'letters' | 'marks' | 'words' };

export function App() {
  const [state, setState] = useState<LearnerState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>(readHash);
  const [session, setSession] = useState<Session | null>(null);
  const [sheet, setSheet] = useState<SheetRef | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy');
  const notesBox = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void loadState().then((s) => { setState(s); setLoaded(true); });
  }, []);
  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /** Apply a change to the learner's state and save it. */
  const commit = useCallback((change: (s: LearnerState) => LearnerState) => {
    setState((prev) => {
      const next = { ...change(prev), rev: prev.rev + 1 };
      void saveState(next);
      return next;
    });
  }, []);

  const say = useCallback((w: Word) => state.mine[w.id] || w.reading, [state.mine]);
  const stats = progress(ORDER, state.cards, Date.now());

  /** Move a session to its current card, building the question if the card is not an introduction. */
  const prepare = useCallback((s: Session): Session => {
    if (s.index >= s.queue.length) return { ...s, done: true, question: null, answered: null };
    const item = s.queue[s.index]!;
    const question = item.intro ? null : makeQuestion(item.id, state.cards[item.id]?.box ?? 0, say);
    return { ...s, question, answered: null };
  }, [state.cards, say]);

  const start = useCallback(() => {
    const { queue, fresh } = buildRound(ORDER, state.cards, Date.now());
    setSession(prepare({ queue, index: 0, asked: 0, right: 0, fresh, done: false, question: null, answered: null }));
  }, [state.cards, prepare]);

  const advance = useCallback(() => {
    setSession((s) => (s ? prepare({ ...s, index: s.index + 1 }) : s));
  }, [prepare]);

  const answer = useCallback((option: number) => {
    if (!session || !session.question || session.answered !== null) return;
    const item = session.queue[session.index]!;
    const ok = option === session.question.correct;
    commit((s) => ({ ...s, cards: { ...s.cards, [item.id]: grade(s.cards[item.id], ok, !!item.retry, Date.now()) } }));
    setSession({
      ...session,
      queue: ok ? session.queue : requeue(session.queue, session.index, item.id),
      asked: session.asked + 1,
      right: session.right + (ok ? 1 : 0),
      answered: option,
    });
  }, [session, commit]);

  const saveWord = useCallback((wordId: string, mine: string, flagged: boolean) => {
    const word = words.find((w) => w.id === wordId);
    const value = mine.trim().slice(0, 60);
    commit((s) => {
      const nextMine = { ...s.mine };
      const nextFlags = { ...s.flags };
      if (value && value !== word?.reading) nextMine[wordId] = value; else delete nextMine[wordId];
      if (flagged) nextFlags[wordId] = true; else delete nextFlags[wordId];
      return { ...s, mine: nextMine, flags: nextFlags };
    });
  }, [commit]);

  const headerButton = () => {
    if (!session || session.done) start();
    window.location.hash = 'practice';
    document.getElementById('view')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const notes = showNotes ? exportNotes(state, words, new Date().toISOString().slice(0, 10)) : '';
  const copyNotes = () => {
    const fallback = () => { notesBox.current?.focus(); notesBox.current?.select(); setCopyLabel('Selected: copy from the menu'); };
    try {
      navigator.clipboard.writeText(notes).then(() => setCopyLabel('Copied'), fallback);
    } catch {
      fallback();
    }
  };

  const inRound = !!session && !session.done;
  return (
    <VoiceProvider>
      <header className="band">
        <div className="wrap">
          <div className="brand">
            <div className="who">
              <Emblem />
              <div>
                <h1>Assyrian Reader</h1>
                <p className="tag">Read what you already speak.</p>
              </div>
            </div>
            <Sy>{meta.brand}</Sy>
          </div>
          <div className="prog">
            <div className="bar" role="img" aria-label={`${stats.started} of ${stats.total} cards started, ${stats.knownWell} known well`}>
              <i className="m" style={{ width: `${(100 * stats.knownWell) / stats.total}%` }} />
              <i className="s" style={{ width: `${(100 * (stats.started - stats.knownWell)) / stats.total}%` }} />
            </div>
            <span className="count">
              {stats.started} of {stats.total} cards started{stats.knownWell ? `, ${stats.knownWell} known well` : ''}
            </span>
            <button className="btn gold" type="button" onClick={headerButton} disabled={!loaded}>
              <Star />
              {inRound ? 'Back to practice' : stats.started ? 'Practise now' : 'Start practice'}
            </button>
          </div>
          <span className="sync">Progress is saved on this device.</span>
        </div>
        <Waves />
      </header>

      <nav className="tabs" aria-label="Sections">
        <div className="wrap">
          {VIEWS.map((v) => (
            <a key={v} href={`#${v}`} aria-current={v === view ? 'page' : undefined}><TabIcon name={v} />{LABEL[v]}</a>
          ))}
        </div>
      </nav>

      <main className="wrap" id="view">
        {view === 'letters' && <LettersView state={state} onOpen={(id) => setSheet({ kind: 'letter', id })} onRecord={() => setSheet({ kind: 'record', of: 'letters' })} />}
        {view === 'marks' && <MarksView onRecord={() => setSheet({ kind: 'record', of: 'marks' })} />}
        {view === 'words' && <WordsView state={state} onOpen={(id) => setSheet({ kind: 'word', id })} onRecord={() => setSheet({ kind: 'record', of: 'words' })} />}
        {view === 'practice' && (
          <PracticeView
            session={session} due={stats.due} notMet={stats.notMet} say={say}
            onStart={start} onGotIt={advance} onAnswer={answer} onNext={advance}
          />
        )}
      </main>

      <footer className="wrap">
        <p>
          Spellings and transliterations come from{' '}
          <a href={meta.sources['wiktionary-swadesh']}>Wiktionary</a>, licensed CC BY-SA 4.0. Script rules follow Richard Ishida&rsquo;s{' '}
          <a href={meta.sources['orthography-notes']}>Assyrian Neo-Aramaic orthography notes</a>. The readings shown are the written standard; where your family says a word differently, save your own.
        </p>
        <VoiceFile />
        <div className="btnrow">
          <button className="btn quiet" type="button" onClick={() => { setShowNotes((x) => !x); setCopyLabel('Copy'); }}>
            {showNotes ? 'Hide my saved notes' : 'Show my saved notes'}
          </button>
        </div>
        {showNotes && (
          <div>
            <textarea id="notes-box" ref={notesBox} readOnly value={notes} aria-label="Your saved pronunciations and flagged spellings" />
            <div className="btnrow" style={{ marginTop: 8 }}>
              <button className="btn quiet" type="button" onClick={copyNotes}>{copyLabel}</button>
            </div>
          </div>
        )}
      </footer>

      {sheet?.kind === 'letter' && <LetterSheet letterId={sheet.id} state={state} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'word' && <WordSheet wordId={sheet.id} state={state} onSave={saveWord} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'record' && <RecorderSheet ids={sheet.of === 'letters' ? LETTER_CARDS : sheet.of === 'marks' ? MARK_CARDS : WORD_CARDS} say={say} onClose={() => setSheet(null)} />}
    </VoiceProvider>
  );
}
