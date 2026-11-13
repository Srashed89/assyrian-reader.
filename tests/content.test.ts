import { describe, expect, it } from 'vitest';
import { letters, marks, words, categories, meta, ORDER } from '../src/content';
import { clusters, romanise, sameReading, soundOut } from '../src/lib/script';
import { nameOf } from '../src/content';

describe('spelling validator', () => {
  // The rule in SPEC.md: reading `script` by rule must reproduce `translit`,
  // ignoring vowel length and doubled consonants. A word that fails does not ship.
  it.each(words.map((w) => [w.id, w] as const))('%s reads as its transliteration', (_id, w) => {
    expect(sameReading(romanise(w.script), w.translit), `${w.script} read as "${romanise(w.script)}", source says "${w.translit}"`).toBe(true);
  });

  it('reads the language name in the header', () => {
    expect(romanise(meta.brand)).toBe('sūrāīṯ');
  });

  it('catches a wrong spelling', () => {
    // "father" with the first vowel mark removed no longer matches bābā.
    expect(sameReading(romanise('ܒܒܵܐ'), 'bābā')).toBe(false);
  });
});

describe('content shape', () => {
  it('has 22 letters, 11 marks and 46 words', () => {
    expect(letters).toHaveLength(22);
    expect(marks).toHaveLength(11);
    expect(words).toHaveLength(46);
  });

  it('has unique ids', () => {
    for (const list of [letters, marks, words, categories]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has eight letters that never join to the next letter', () => {
    expect(letters.filter((l) => l.joins === 'right').map((l) => l.name)).toEqual(['Alap', 'Dalath', 'He', 'Waw', 'Zain', 'Sadhe', 'Resh', 'Taw']);
  });

  it('gives every letter a single base character in the Syriac block', () => {
    for (const l of letters) {
      expect([...l.char]).toHaveLength(1);
      expect(clusters(l.char)).toHaveLength(1);
    }
  });

  it('puts every word in a known category with a known source', () => {
    const cats = new Set(categories.map((c) => c.id));
    for (const w of words) {
      expect(cats.has(w.category), w.id).toBe(true);
      expect(Object.keys(meta.sources), w.id).toContain(w.source);
    }
  });

  it('uses only known letters in words', () => {
    const known = new Set(letters.map((l) => l.char));
    for (const w of words) for (const c of clusters(w.script)) expect(known.has(c.base), `${w.id}: ${c.base}`).toBe(true);
  });

  it('makes one card per letter, mark and word', () => {
    expect(ORDER).toHaveLength(letters.length + marks.length + words.length);
  });
});

describe('sounding out', () => {
  const read = (s: string) => soundOut(s, nameOf).map((c) => c.sound);

  it('softens Beth to w', () => {
    expect(read('ܫܲܒ݂ܪܵܐ')).toEqual(['sha', 'w', 'rā', 'silent']);
    expect(soundOut('ܫܲܒ݂ܪܵܐ', nameOf)[1]!.parts).toEqual(['Beth', 'soft dot']);
  });

  it('treats a plain Yodh after long e as part of the vowel', () => {
    expect(read('ܪܹܝܫܵܐ')).toEqual(['rē', 'lengthens ē', 'shā', 'silent']);
  });

  it('keeps Yodh as y after short a', () => {
    expect(read('ܒܲܝܬܵܐ')).toEqual(['ba', 'y', 'tā', 'silent']);
  });

  it('marks a letter under the silent line as silent', () => {
    expect(read('ܐܲܢ݇ܬ')).toEqual(['a', 'silent', 't']);
  });

  it('reads Waw and Yodh as vowels when dotted', () => {
    expect(read('ܢܘܼܪܵܐ')).toEqual(['n', 'ū', 'rā', 'silent']);
    expect(read('ܙܥܘܿܪܵܐ')).toEqual(['z', 'ʿ', 'ō', 'rā', 'silent']);
    expect(read('ܐܝܼܠܵܢܵܐ')).toEqual(['silent', 'ī', 'lā', 'nā', 'silent']);
  });

  it('keeps the plural dots without changing the sound', () => {
    const cells = soundOut('ܡܲܝ̈ܵܐ', nameOf);
    expect(cells.map((c) => c.sound)).toEqual(['ma', 'yā', 'silent']);
    expect(cells[1]!.parts).toContain('plural dots');
  });

  it('rebuilds each word exactly from its clusters', () => {
    for (const w of words) expect(soundOut(w.script, nameOf).map((c) => c.glyph).join('')).toBe(w.script);
  });
});
