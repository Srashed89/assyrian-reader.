import { get, set } from 'idb-keyval';
import type { Word } from '../types';
import type { Cards } from './scheduler';

/** Everything the app remembers about the learner. Kept apart from content. */
export interface LearnerState {
  v: 1;
  /** Counts saves, so the newer of two copies can be told apart. */
  rev: number;
  cards: Cards;
  /** The learner's own reading of a word, by word id. */
  mine: Record<string, string>;
  /** Words whose spelling the learner has flagged, by word id. */
  flags: Record<string, true>;
}

const KEY = 'assyrian-reader-state-v1';

export const emptyState = (): LearnerState => ({ v: 1, rev: 0, cards: {}, mine: {}, flags: {} });

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Turn anything read from storage into a well-formed state, dropping what does not fit. */
export function sanitise(raw: unknown): LearnerState {
  const out = emptyState();
  if (!isRecord(raw)) return out;
  if (typeof raw.rev === 'number' && Number.isFinite(raw.rev)) out.rev = raw.rev;
  if (isRecord(raw.cards)) {
    for (const [id, c] of Object.entries(raw.cards)) {
      if (isRecord(c) && typeof c.box === 'number' && typeof c.due === 'number') {
        out.cards[id] = { box: Math.max(0, Math.min(5, Math.round(c.box))), due: c.due, seen: typeof c.seen === 'number' ? c.seen : 0 };
      }
    }
  }
  if (isRecord(raw.mine)) {
    for (const [id, v] of Object.entries(raw.mine)) if (typeof v === 'string' && v.trim()) out.mine[id] = v.trim().slice(0, 60);
  }
  if (isRecord(raw.flags)) {
    for (const [id, v] of Object.entries(raw.flags)) if (v) out.flags[id] = true;
  }
  return out;
}

/** Load from IndexedDB, falling back to localStorage, then to an empty state. */
export async function loadState(): Promise<LearnerState> {
  try {
    const v = await get(KEY);
    if (v) return sanitise(v);
  } catch { /* fall through */ }
  try {
    const r = localStorage.getItem(KEY);
    if (r) return sanitise(JSON.parse(r));
  } catch { /* fall through */ }
  return emptyState();
}

export async function saveState(state: LearnerState): Promise<void> {
  try {
    await set(KEY, state);
  } catch {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* nothing more to try */ }
  }
}

/** The learner's saved readings and flagged spellings, in the same shape the prototype exports. */
export function exportNotes(state: LearnerState, words: Word[], today: string): string {
  const pronunciations = words
    .filter((w) => state.mine[w.id])
    .map((w) => ({ id: w.id, script: w.script, standard: w.translit, mine: state.mine[w.id] }));
  const flaggedSpellings = words
    .filter((w) => state.flags[w.id])
    .map((w) => ({ id: w.id, script: w.script, standard: w.translit }));
  return JSON.stringify({ exported: today, pronunciations, flaggedSpellings }, null, 2);
}
