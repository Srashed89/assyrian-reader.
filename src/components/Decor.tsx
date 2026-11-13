/**
 * Decoration in the colours of the Assyrian flag: blue, red, gold and white.
 * These shapes carry no script and no meaning, so every one is hidden from screen readers.
 */

/** A four-pointed star, the shape at the centre of the flag. Takes the current text colour. */
export function Star({ className }: { className?: string }) {
  return (
    <svg className={className ? `star ${className}` : 'star'} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 1.5 14.7 9.3 22.5 12 14.7 14.7 12 22.5 9.3 14.7 1.5 12 9.3 9.3Z"
        fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  );
}

/** The flag's centre: a blue four-pointed star around a gold sun, on a white disc. */
export function Emblem() {
  return (
    <svg className="emblem" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" fill="var(--white)" />
      <path
        d="M24 4.5 29 19 43.5 24 29 29 24 43.5 19 29 4.5 24 19 19Z"
        fill="var(--flag-blue)" stroke="var(--flag-blue)" strokeWidth="2" strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="6.5" fill="var(--gold)" />
    </svg>
  );
}

const WAVE = 'Q150,{a} 300,{y} T600,{y} T900,{y} T1200,{y} V40 H0 Z';
function wave(y: number): string {
  return `M0,${y} ${WAVE.replaceAll('{a}', String(y - 12)).replaceAll('{y}', String(y))}`;
}

/** The flag's wavy stripes, red then white, running along the bottom of the blue band. */
export function Waves() {
  return (
    <svg className="waves" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={wave(9)} fill="var(--red)" />
      <path d={wave(19)} fill="var(--white)" />
      <path d={wave(29)} fill="var(--bg)" />
    </svg>
  );
}

/** A burst of falling pieces for the end of a round. Stays still when the device asks for less motion. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} style={{ left: `${4 + i * 6}%`, animationDelay: `${(i % 5) * 0.12}s` }} />
      ))}
    </div>
  );
}

/** Small pictures for the four sections. */
export function TabIcon({ name }: { name: 'letters' | 'marks' | 'words' | 'practice' }) {
  if (name === 'practice') return <Star />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      {name === 'letters' && (
        <>
          <rect x="2.5" y="2.5" width="8" height="8" rx="2.5" />
          <rect x="13.5" y="2.5" width="8" height="8" rx="2.5" />
          <rect x="2.5" y="13.5" width="8" height="8" rx="2.5" />
          <rect x="13.5" y="13.5" width="8" height="8" rx="2.5" />
        </>
      )}
      {name === 'marks' && (
        <>
          <circle cx="8" cy="5" r="2.6" />
          <circle cx="16" cy="5" r="2.6" />
          <rect x="3" y="10.5" width="18" height="4" rx="2" />
          <circle cx="12" cy="20" r="2.6" />
        </>
      )}
      {name === 'words' && (
        <path d="M5 3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.5L7 21.5V17H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
      )}
    </svg>
  );
}
