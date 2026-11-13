import lettersJson from '../content/letters.json';
import marksJson from '../content/marks.json';
import wordsJson from '../content/words.json';
import categoriesJson from '../content/categories.json';
import metaJson from '../content/meta.json';
import voiceJson from '../content/voice.json';
import type { CardId, Category, Letter, Mark, Word } from './types';
import { buildOrder } from './lib/order';

export const letters = lettersJson as Letter[];
export const marks = marksJson as Mark[];
export const words = wordsJson as Word[];
export const categories = categoriesJson as Category[];
export const meta = metaJson;
/** The voice that comes with the app: a sound file for each card that has one, by card id. */
export const builtInVoice: { name: string; source: string; clips: Record<string, string> } = voiceJson;

export const letterByChar = new Map(letters.map((l) => [l.char, l]));
export const letterById = new Map(letters.map((l) => [l.id, l]));
export const markById = new Map(marks.map((m) => [m.id as string, m]));
export const wordById = new Map(words.map((w) => [w.id, w]));

export const nameOf = (base: string): string => letterByChar.get(base)?.name ?? base;

/** Every card, in lesson order. */
export const ORDER: CardId[] = buildOrder(letters, marks, words);

export function parseCard(id: CardId): { kind: 'letter' | 'mark' | 'word'; key: string } {
  const at = id.indexOf(':');
  return { kind: id.slice(0, at) as 'letter' | 'mark' | 'word', key: id.slice(at + 1) };
}

/** What a card shows in script. */
export function cardGlyph(id: CardId): string {
  const { kind, key } = parseCard(id);
  if (kind === 'letter') return letterById.get(key)?.char ?? '';
  if (kind === 'mark') return markById.get(key)?.sample ?? '';
  return wordById.get(key)?.script ?? '';
}
