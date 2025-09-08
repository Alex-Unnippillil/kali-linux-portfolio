'use client';

import { useEffect, useState } from 'react';

interface LetterRailProps {
  letters: string[];
  grouped: Record<string, unknown[]>;
}

const LetterRail = ({ letters, grouped }: LetterRailProps) => {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const midpoint = window.scrollY + window.innerHeight / 2;
      let current: string | null = null;
      for (const letter of letters) {
        const el = document.getElementById(`section-${letter}`);
        if (el) {
          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;
          if (midpoint >= top && midpoint < bottom) {
            current = letter;
            break;
          }
        }
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [letters, grouped]);

  const handleClick = (letter: string) => {
    const el = document.getElementById(`section-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Alphabet navigation" className="fixed right-2 top-1/2 -translate-y-1/2">
      <ul className="flex flex-col items-center space-y-1">
        {letters.map((letter) => {
          const disabled = !grouped[letter];
          const classes = `h-6 w-6 text-xs ${disabled
            ? 'cursor-default text-gray-400'
            : active === letter
              ? 'font-bold text-blue-600'
              : 'text-blue-600 hover:underline'}`;
          return (
            <li key={letter}>
              <button
                type="button"
                aria-label={`Jump to ${letter} section`}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => !disabled && handleClick(letter)}
                className={classes}
              >
                {letter}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default LetterRail;

