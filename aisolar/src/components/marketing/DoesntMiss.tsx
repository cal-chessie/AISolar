/**
 * DoesntMiss — the cal.com "doesn't miss on X" reel (Cal loved it, 25 Jul).
 *
 * Composition matches cal.com: a static prefix ("AITeam doesn't miss on") beside
 * a spotlight column. The column shows three rows — faded above, the current
 * feature in the accent colour in the middle, faded below — and slides up one row
 * on each change, so it reads as a reel without ever overlapping the prefix.
 * Feature list is real (the agent runtime); motion is reduced-motion gated.
 */
import { useEffect, useState } from 'react';

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduce;
}

export function DoesntMiss({
  subject = 'AITeam',
  accentClass = 'text-doc-deposit',
  features,
}: {
  subject?: string;
  accentClass?: string;
  features: string[];
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI(v => (v + 1) % features.length), 2200);
    return () => clearInterval(id);
  }, [reduce, features.length]);

  const n = features.length;
  const prev = features[(i - 1 + n) % n];
  const curr = features[i];
  const next = features[(i + 1) % n];

  return (
    <section className="overflow-hidden py-24 sm:py-36">
      <style>{`@keyframes dm-reel { from { transform: translateY(1.2em); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-col items-center gap-y-1 text-xl font-bold tracking-tight sm:flex-row sm:items-center sm:justify-center sm:gap-x-3 sm:text-2xl md:text-3xl lg:text-4xl">
          <span className="whitespace-nowrap sm:text-right">{subject} doesn't miss on</span>
          <span
            className="relative inline-flex flex-col overflow-hidden align-middle [mask-image:linear-gradient(to_bottom,transparent,black_32%,black_68%,transparent)]"
            style={{ height: '3.6em', lineHeight: '1.2em' }}
            aria-live="polite"
          >
            <span
              key={i}
              className="flex flex-col"
              style={reduce ? undefined : { animation: 'dm-reel 0.6s cubic-bezier(0.22,1,0.36,1)' }}
            >
              <span aria-hidden className="block whitespace-nowrap text-muted-foreground/30">{prev}</span>
              <span className={`block whitespace-nowrap ${accentClass}`}>{curr}</span>
              <span aria-hidden className="block whitespace-nowrap text-muted-foreground/30">{next}</span>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
