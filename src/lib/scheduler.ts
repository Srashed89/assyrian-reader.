import type { CardId } from '../types';

const MINUTE = 60_000;
const DAY = 86_400_000;

/** Wait before the next review, by box: now, 10 minutes, then 1, 3, 7 and 21 days. */
export const INTERVALS_MS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
export const MAX_BOX = 5;
export const KNOWN_WELL_BOX = 4;
export const ROUND_SIZE = 10;
export const MAX_NEW = 4;
/** A missed card comes back this many cards later. */
export const RETRY_GAP = 3;

export interface CardState {
  box: number;
  /** Time the card is next due, in milliseconds since the epoch. */
  due: number;
  seen: number;
}
export type Cards = Record<string, CardState>;

export interface QueueItem {
  id: CardId;
  /** Show the card with its explanation before testing it. */
  intro?: boolean;
  /** A repeat of a card missed earlier in this round. */
  retry?: boolean;
  /** An extra pass that fills the round. */
  again?: boolean;
}

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Grade one answer.
 * Right: up one box. Wrong: back to box 1. A right answer on a repeat does not promote.
 */
export function grade(prev: CardState | undefined, correct: boolean, isRetry: boolean, now: number): CardState {
  const before = prev?.box ?? 0;
  const box = !correct ? 1 : isRetry ? before : Math.min(MAX_BOX, before + 1);
  return { box, due: now + INTERVALS_MS[box]!, seen: (prev?.seen ?? 0) + 1 };
}

/** Build one round of about ten questions from the lesson order and the learner's cards. */
export function buildRound(order: CardId[], cards: Cards, now: number, rng: Rng = Math.random): { queue: QueueItem[]; fresh: number } {
  const seen = order.filter((id) => cards[id]);
  const due = seen
    .filter((id) => cards[id]!.due <= now)
    .sort((a, b) => cards[a]!.box - cards[b]!.box || cards[a]!.due - cards[b]!.due)
    .slice(0, ROUND_SIZE);
  const fresh = order.filter((id) => !cards[id]).slice(0, Math.max(0, Math.min(MAX_NEW, ROUND_SIZE - due.length)));

  const queue: QueueItem[] = [];
  for (let i = 0; i < fresh.length; i += 2) {
    const pair = fresh.slice(i, i + 2);
    pair.forEach((id) => queue.push({ id, intro: true }));
    pair.forEach((id) => queue.push({ id }));
  }
  due.forEach((id) => queue.push({ id }));

  let questions = queue.filter((q) => !q.intro).length;
  const extra = [
    ...shuffle(fresh, rng),
    ...seen.filter((id) => !due.includes(id)).sort((a, b) => cards[a]!.box - cards[b]!.box),
  ];
  while (questions < ROUND_SIZE && extra.length) {
    queue.push({ id: extra.shift()!, again: true });
    questions++;
  }
  return { queue, fresh: fresh.length };
}

/** Put a missed card back into the queue a few cards later. */
export function requeue(queue: QueueItem[], index: number, id: CardId): QueueItem[] {
  const q = queue.slice();
  q.splice(Math.min(q.length, index + RETRY_GAP), 0, { id, retry: true });
  return q;
}

export function progress(order: CardId[], cards: Cards, now: number) {
  const started = order.filter((id) => cards[id]).length;
  const knownWell = order.filter((id) => (cards[id]?.box ?? 0) >= KNOWN_WELL_BOX).length;
  const due = order.filter((id) => cards[id] && cards[id]!.due <= now).length;
  return { total: order.length, started, knownWell, due, notMet: order.length - started };
}
