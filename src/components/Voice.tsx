import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CardId } from '../types';
import { countRecorded, deleteClip, listClips, loadClip, saveClip, type Clip } from '../lib/clips';
import { canRecord, MAX_MS, playClip, RecorderFailure, startRecording, type Recording } from '../lib/recorder';
import { Mic, Speaker } from './Decor';

/** The learner's recorded voice: which cards have a clip, and how to play, save and remove one. */
export interface VoiceApi {
  canRecord: boolean;
  has(id: CardId): boolean;
  play(id: CardId): void;
  save(id: CardId, clip: Clip): Promise<void>;
  remove(id: CardId): Promise<void>;
}

/** With no provider (as in a plain render) there is no voice: nothing to hear and no way to record. */
const SILENT: VoiceApi = { canRecord: false, has: () => false, play: () => {}, save: async () => {}, remove: async () => {} };

export const VoiceContext = createContext<VoiceApi>(SILENT);
export const useVoice = () => useContext(VoiceContext);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    listClips().then((found) => setIds(new Set(found)), () => {});
  }, []);
  const api = useMemo<VoiceApi>(() => ({
    canRecord: canRecord(),
    has: (id) => ids.has(id),
    play: (id) => { void loadClip(id).then((clip) => clip && playClip(clip)).catch(() => {}); },
    save: async (id, clip) => {
      await saveClip(id, clip);
      setIds((before) => new Set(before).add(id));
    },
    remove: async (id) => {
      await deleteClip(id);
      setIds((before) => { const next = new Set(before); next.delete(id); return next; });
    },
  }), [ids]);
  return <VoiceContext.Provider value={api}>{children}</VoiceContext.Provider>;
}

/** Plays the learner's clip for a card. Shows nothing when the card has no clip. */
export function HearButton({ id, auto }: { id: CardId; auto?: boolean }) {
  const voice = useVoice();
  const has = voice.has(id);
  // Latest play function, so the clip is played once per card and not again each time the clip list changes.
  const play = useRef(voice.play);
  play.current = voice.play;
  useEffect(() => {
    if (auto && has) play.current(id);
  }, [auto, has, id]);
  if (!has) return null;
  return (
    <button className="btn gold" type="button" onClick={() => voice.play(id)}>
      <Speaker />Hear it
    </button>
  );
}

const BLOCKED = 'The microphone is blocked. Allow it in your browser settings, then try again.';
const UNSUPPORTED = 'This browser cannot record sound.';
const FAILED = 'That did not save. Try again.';

/** Records the learner saying a card, saves the clip and plays it back. */
export function RecordButton({ id }: { id: CardId }) {
  const voice = useVoice();
  const [phase, setPhase] = useState<'idle' | 'starting' | 'live' | 'saving'>('idle');
  const [error, setError] = useState('');
  const recording = useRef<Recording | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const finish = useCallback(async () => {
    const current = recording.current;
    if (!current) return;
    recording.current = null;
    window.clearTimeout(timer.current);
    setPhase('saving');
    try {
      const clip = await current.stop();
      if (!clip.data.byteLength) throw new Error('empty');
      await voice.save(id, clip);
      void playClip(clip).catch(() => {});
    } catch {
      setError(FAILED);
    }
    setPhase('idle');
  }, [id, voice]);

  const begin = async () => {
    setError('');
    setPhase('starting');
    try {
      recording.current = await startRecording();
      setPhase('live');
      timer.current = window.setTimeout(() => void finish(), MAX_MS);
    } catch (e) {
      setPhase('idle');
      setError(e instanceof RecorderFailure && e.reason === 'blocked' ? BLOCKED : UNSUPPORTED);
    }
  };

  // Leaving the card mid-recording throws the recording away and frees the microphone.
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    recording.current?.cancel();
    recording.current = null;
  }, []);

  if (!voice.canRecord) return null;
  const live = phase === 'live';
  return (
    <>
      <button
        className={live ? 'btn rec live' : 'btn rec'} type="button"
        disabled={phase === 'starting' || phase === 'saving'}
        onClick={live ? () => void finish() : () => void begin()}
      >
        <Mic />{live ? 'Stop' : voice.has(id) ? 'Record again' : 'Record'}
      </button>
      <span className="err" aria-live="polite">{live ? 'Recording. Say it now, then press Stop.' : error}</span>
    </>
  );
}

/** Hear, record and delete controls for one card, shown inside a letter or word sheet. */
export function VoicePanel({ id }: { id: CardId }) {
  const voice = useVoice();
  const has = voice.has(id);
  if (!voice.canRecord && !has) return null;
  return (
    <>
      <p className="cat">Your voice</p>
      {!has && <p className="hint">Record yourself saying it. After that, tap Hear it any time.</p>}
      <div className="btnrow">
        <HearButton id={id} />
        <RecordButton id={id} key={id} />
        {has && <button className="btn quiet" type="button" onClick={() => void voice.remove(id)}>Delete</button>}
      </div>
    </>
  );
}

/** A card at the top of a list that counts the clips recorded and opens the recording session. */
export function VoiceCard({ ids, things, onOpen }: { ids: readonly CardId[]; things: string; onOpen: () => void }) {
  const voice = useVoice();
  const done = countRecorded(ids, voice.has);
  if (!voice.canRecord && !done) return null;
  return (
    <section className="vcard">
      <p className="vhead"><Mic />Your voice</p>
      <p>Record yourself saying the {things}. Then the app can say them back while you read.</p>
      <p className="vcount">{done} of {ids.length} recorded</p>
      {voice.canRecord && (
        <div className="btnrow">
          <button className="btn rec" type="button" onClick={onOpen}>
            <Mic />{done === 0 ? `Record the ${things}` : done < ids.length ? 'Keep recording' : 'Record again'}
          </button>
        </div>
      )}
    </section>
  );
}
