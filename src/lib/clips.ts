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

/** Every clip on this device, with its card id. */
export async function allClips(): Promise<[CardId, Clip][]> {
  const out: [CardId, Clip][] = [];
  for (const id of await listClips()) {
    const clip = await loadClip(id);
    if (clip) out.push([id, clip]);
  }
  return out;
}

function toBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

function fromBase64(text: string): ArrayBuffer {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

const CARD_ID = /^(letter|mark|word):[\w-]+$/;

/** Put clips into one piece of text, so a voice can be saved as a file and carried to another device. */
export function packClips(clips: readonly [CardId, Clip][]): string {
  const out: Record<string, { type: string; data: string }> = {};
  for (const [id, clip] of clips) out[id] = { type: clip.type, data: toBase64(clip.data) };
  return JSON.stringify({ app: 'assyrian-reader', kind: 'voice', v: 1, clips: out });
}

/** Read a voice file back into clips. Anything that is not a sound clip for a card is dropped. */
export function unpackClips(text: string): [CardId, Clip][] {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return []; }
  const pack = raw as { kind?: unknown; clips?: unknown };
  if (typeof pack !== 'object' || pack === null || pack.kind !== 'voice' || typeof pack.clips !== 'object' || pack.clips === null) return [];
  const out: [CardId, Clip][] = [];
  for (const [id, value] of Object.entries(pack.clips as Record<string, unknown>)) {
    const entry = value as { type?: unknown; data?: unknown };
    if (!CARD_ID.test(id) || typeof entry?.type !== 'string' || !entry.type.startsWith('audio/') || typeof entry.data !== 'string') continue;
    try {
      const data = fromBase64(entry.data);
      if (data.byteLength) out.push([id as CardId, { type: entry.type, data }]);
    } catch { /* not valid sound data: skip it */ }
  }
  return out;
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
