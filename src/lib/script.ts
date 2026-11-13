import type { MarkId } from '../types';

/** The combining marks the Eastern (Madnhaya) script uses, by code point. */
export const MARK = {
  pthaha: 'ܲ',
  zqapa: 'ܵ',
  zlamaShort: 'ܸ',
  zlamaLong: 'ܹ',
  dotBelow: 'ܼ',
  dotAbove: 'ܿ',
  soft: '݂',
  silent: '݇',
  plural: '̈',
  tilde: '̰',
  softPe: '̮',
} as const;

/** Baseline extender, used to show a letter's joined shapes. */
export const TATWEEL = 'ـ';

const ALAP = 'ܐ';
const WAW = 'ܘ';
const YODH = 'ܝ';

export interface Cluster {
  base: string;
  marks: string[];
}

/** Split a word into clusters: each base letter with the marks that sit on it. */
export function clusters(word: string): Cluster[] {
  const out: Cluster[] = [];
  for (const ch of word) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x710 && cp <= 0x72c) out.push({ base: ch, marks: [] });
    else if (out.length) out[out.length - 1]!.marks.push(ch);
  }
  return out;
}

const SOUND: Record<string, string> = {
  'ܐ': '', 'ܒ': 'b', 'ܓ': 'g', 'ܕ': 'd', 'ܗ': 'h', 'ܘ': 'w', 'ܙ': 'z', 'ܚ': 'kh', 'ܛ': 'ṭ', 'ܝ': 'y', 'ܟ': 'k',
  'ܠ': 'l', 'ܡ': 'm', 'ܢ': 'n', 'ܣ': 's', 'ܥ': 'ʿ', 'ܦ': 'p', 'ܨ': 'ṣ', 'ܩ': 'q', 'ܪ': 'r', 'ܫ': 'sh', 'ܬ': 't',
};
const SOFT: Record<string, string> = { 'ܒ': 'w', 'ܓ': 'gh', 'ܕ': 'dh', 'ܟ': 'kh', 'ܬ': 'th' };
const TILDE: Record<string, string> = { 'ܓ': 'j', 'ܟ': 'ch', 'ܫ': 'zh', 'ܙ': 'zh' };

function isBareYodhAfterLongE(cs: Cluster[], i: number): boolean {
  const c = cs[i]!;
  const prev = cs[i - 1];
  return (
    c.base === YODH &&
    c.marks.every((m) => m === MARK.plural) &&
    !!prev &&
    prev.marks.includes(MARK.zlamaLong)
  );
}

export interface Sounded {
  /** The cluster as written: base letter plus its marks. */
  glyph: string;
  base: string;
  /** How this cluster is read, or "silent". */
  sound: string;
  /** What it is made of, for example ["Shin", "pthaha"]. */
  parts: string[];
}

/** Sound a word out cluster by cluster. `nameOf` turns a base letter into its name. */
export function soundOut(word: string, nameOf: (base: string) => string): Sounded[] {
  const cs = clusters(word);
  return cs.map((c, i) => {
    const has = (m: string) => c.marks.includes(m);
    const parts = [nameOf(c.base)];
    let cons = SOUND[c.base] ?? '';
    let vowel = '';
    let silent = false;
    if (has(MARK.soft)) { cons = SOFT[c.base] ?? cons; parts.push('soft dot'); }
    if (has(MARK.softPe)) { cons = 'f'; parts.push('soft mark'); }
    if (has(MARK.tilde)) { cons = TILDE[c.base] ?? cons; parts.push('tilde'); }
    if (has(MARK.silent)) { silent = true; parts.push('silent line'); }
    if (c.base === YODH && has(MARK.dotBelow)) { cons = ''; vowel += 'ī'; parts.push('dot below'); }
    else if (c.base === WAW && has(MARK.dotBelow)) { cons = ''; vowel += 'ū'; parts.push('dot below'); }
    else if (c.base === WAW && has(MARK.dotAbove)) { cons = ''; vowel += 'ō'; parts.push('dot above'); }
    if (has(MARK.pthaha)) { vowel += 'a'; parts.push('pthaha'); }
    if (has(MARK.zqapa)) { vowel += 'ā'; parts.push('zqapa'); }
    if (has(MARK.zlamaShort)) { vowel += 'i'; parts.push('short zlama'); }
    if (has(MARK.zlamaLong)) { vowel += 'ē'; parts.push('long zlama'); }
    if (has(MARK.plural)) parts.push('plural dots');

    let sound: string;
    if (silent) sound = 'silent';
    else if (isBareYodhAfterLongE(cs, i)) sound = 'lengthens ē';
    else if (c.base === ALAP) sound = vowel || 'silent';
    else sound = cons + vowel;
    if (!sound) sound = 'silent';
    return { glyph: c.base + c.marks.join(''), base: c.base, sound, parts };
  });
}

/** The marks a word uses, in the order they first appear. */
export function marksIn(word: string): MarkId[] {
  const out: MarkId[] = [];
  const add = (id: MarkId) => { if (!out.includes(id)) out.push(id); };
  for (const c of clusters(word)) {
    const has = (m: string) => c.marks.includes(m);
    if (has(MARK.pthaha)) add('pt');
    if (has(MARK.zqapa)) add('zq');
    if (has(MARK.zlamaShort)) add('zs');
    if (has(MARK.zlamaLong)) add('zl');
    if (c.base === YODH && has(MARK.dotBelow)) add('hw');
    if (c.base === WAW && has(MARK.dotBelow)) add('rs');
    if (c.base === WAW && has(MARK.dotAbove)) add('rh');
    if (has(MARK.soft)) add('rk');
    if (has(MARK.silent)) add('tq');
    if (has(MARK.plural)) add('sy');
    if (has(MARK.tilde)) add('mj');
  }
  return out;
}

const ROMAN: Record<string, string> = {
  'ܐ': '', 'ܒ': 'b', 'ܓ': 'g', 'ܕ': 'd', 'ܗ': 'h', 'ܘ': 'w', 'ܙ': 'z', 'ܚ': 'ḥ', 'ܛ': 'ṭ', 'ܝ': 'y', 'ܟ': 'k',
  'ܠ': 'l', 'ܡ': 'm', 'ܢ': 'n', 'ܣ': 's', 'ܥ': 'ˁ', 'ܦ': 'p', 'ܨ': 'ṣ', 'ܩ': 'q', 'ܪ': 'r', 'ܫ': 'š', 'ܬ': 't',
};
const ROMAN_SOFT: Record<string, string> = { 'ܒ': 'ḇ', 'ܓ': 'ḡ', 'ܕ': 'ḏ', 'ܟ': 'ḵ', 'ܬ': 'ṯ' };

/**
 * Read a spelling by rule into Wiktionary-style transliteration.
 * This is the validator's half of the check: it must agree with the source's own transliteration.
 */
export function romanise(word: string): string {
  const cs = clusters(word);
  let out = '';
  cs.forEach((c, i) => {
    const has = (m: string) => c.marks.includes(m);
    if (has(MARK.silent)) return;
    if (isBareYodhAfterLongE(cs, i)) return;
    let cons = has(MARK.soft) ? ROMAN_SOFT[c.base] ?? ROMAN[c.base] ?? '' : ROMAN[c.base] ?? '';
    if (has(MARK.softPe)) cons = 'f';
    let vowel = '';
    if (c.base === YODH && has(MARK.dotBelow)) { cons = ''; vowel += 'ī'; }
    else if (c.base === WAW && has(MARK.dotBelow)) { cons = ''; vowel += 'ū'; }
    else if (c.base === WAW && has(MARK.dotAbove)) { cons = ''; vowel += 'ō'; }
    if (has(MARK.pthaha)) vowel += 'a';
    if (has(MARK.zqapa)) vowel += 'ā';
    if (has(MARK.zlamaShort)) vowel += 'i';
    if (has(MARK.zlamaLong)) vowel += 'ē';
    out += cons + vowel;
  });
  return out;
}

/** Compare two transliterations, ignoring vowel length and doubled consonants. */
export function sameReading(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.normalize('NFD').replace(/̄/g, '').normalize('NFC').replace(/(.)\1+/gu, '$1');
  return norm(a) === norm(b);
}
