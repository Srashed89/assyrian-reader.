export type MarkId = 'pt' | 'zq' | 'zs' | 'zl' | 'hw' | 'rs' | 'rh' | 'rk' | 'tq' | 'sy' | 'mj';

export interface Letter {
  id: string;
  char: string;
  name: string;
  sound: string;
  note: string;
  /** 'right': joins only to the letter before it. 'both': joins on both sides. */
  joins: 'right' | 'both';
  variants: { form: string; sound: string }[];
}

export interface Mark {
  id: MarkId;
  /** The mark shown on a carrier letter. */
  sample: string;
  name: string;
  effect: string;
  note: string;
  group: 'vowel' | 'other';
}

export interface Word {
  id: string;
  /** Spelling with every vowel mark, exactly as sourced. */
  script: string;
  /** The source's scholarly transliteration. */
  translit: string;
  /** Plain-letter reading shown to the learner. */
  reading: string;
  english: string;
  category: string;
  source: string;
  /** True once a fluent reader has confirmed the spelling. */
  checked: boolean;
}

export interface Category {
  id: string;
  label: string;
}

/** `letter:<id>`, `mark:<id>` or `word:<id>`. */
export type CardId = `${'letter' | 'mark' | 'word'}:${string}`;
