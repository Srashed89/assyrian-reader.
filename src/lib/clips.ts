import { del, get, keys, set } from 'idb-keyval';
import type { CardId } from '../types';

/**
 * One recording of the learner's voice. Kept as plain bytes plus the sound format,
 * which every browser's database can store.
 *
 * Clips are the learner's own data. They live on the device under the card's id,
 * apart from both the content and the rest of the learner state, and never go into the repository.
 */
export interface Clip {
  type: string;
  data: ArrayBuffer;
}

const PREFIX = 'assyrian-reader-clip:';

const isClip = (x: unknown): x is Clip =>
  typeof x === 'object' && x !== null && typeof (x as Clip).type === 'string' && (x as Clip).data instanceof ArrayBuffer;

export async function saveClip(id: CardId, clip: Clip): Promise<void> {
  await set(PREFIX + id, clip);
}

export async function loadClip(id: CardId): Promise<Clip | undefined> {
  const found: unknown = await get(PREFIX + id);
  return isClip(found) ? found : undefined;
}

export async function deleteClip(id: CardId): Promise<void> {
  await del(PREFIX + id);
}

/** The ids of every card that has a clip on this device. */
export async function listClips(): Promise<CardId[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length) as CardId);
}

/** Where a recording session should open: the first card with no clip yet, or the start when every card has one. */
export function firstUnrecorded(ids: readonly CardId[], has: (id: CardId) => boolean): number {
  const at = ids.findIndex((id) => !has(id));
  return at < 0 ? 0 : at;
}

/** How many of these cards have a clip. */
export function countRecorded(ids: readonly CardId[], has: (id: CardId) => boolean): number {
  return ids.reduce((n, id) => n + (has(id) ? 1 : 0), 0);
}
