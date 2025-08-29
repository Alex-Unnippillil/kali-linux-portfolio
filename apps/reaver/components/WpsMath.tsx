'use client';

import React, { useEffect, useState } from 'react';

const checksum = (pin: number) => {
  let accum = 0;
  while (pin > 0) {
    accum += 3 * (pin % 10);
    pin = Math.floor(pin / 10);
    accum += pin % 10;
    pin = Math.floor(pin / 10);
  }
  return (10 - (accum % 10)) % 10;
};

const TARGET_PIN = 12345670;
const FIRST_HALF_TARGET = Math.floor(TARGET_PIN / 10000);
const SECOND_HALF_TARGET = Math.floor((TARGET_PIN % 10000) / 10);

const WpsMath: React.FC = () => {
  const [phase, setPhase] = useState<'first' | 'second' | 'done'>('first');
  const [firstGuess, setFirstGuess] = useState(0);
  const [secondGuess, setSecondGuess] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (phase !== 'first') return;
    if (firstGuess === FIRST_HALF_TARGET) {
      const t = setTimeout(() => setPhase('second'), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setFirstGuess((g) => g + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    }, 300);
    return () => clearTimeout(t);
  }, [firstGuess, phase]);

  useEffect(() => {
    if (phase !== 'second') return;
    if (secondGuess === SECOND_HALF_TARGET) {
      const t = setTimeout(() => setPhase('done'), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setSecondGuess((g) => g + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    }, 300);
    return () => clearTimeout(t);
  }, [secondGuess, phase]);

  const pin7 = Number(
    `${firstGuess.toString().padStart(4, '0')}${secondGuess
      .toString()
      .padStart(3, '0')}`,
  );
  const fullPin = `${pin7}${checksum(pin7)}`;

  const restart = () => {
    setPhase('first');
    setFirstGuess(0);
    setSecondGuess(0);
  };

  return (
    <div className="bg-gray-800 p-4 rounded text-center">
      <div className="font-mono text-2xl mb-2">
        {fullPin.split('').map((d, i) => (
          <span
            key={i}
            className={`inline-block w-5 ${
              phase === 'done'
                ? 'text-green-400'
                : flash
                ? 'animate-pulse text-red-400'
                : ''
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <p className="mb-4 text-sm">
        {phase === 'first' && `Testing first half ${firstGuess
          .toString()
          .padStart(4, '0')}`}
        {phase === 'second' && `Testing second half ${secondGuess
          .toString()
          .padStart(3, '0')}`}
        {phase === 'done' && 'PIN cracked!'}
      </p>
      <div className="space-y-2 mb-4">
        <div className="w-full bg-gray-700 h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-2 transition-all duration-300"
            style={{ width: `${(firstGuess / 10000) * 100}%` }}
          />
        </div>
        {phase !== 'first' && (
          <div className="w-full bg-gray-700 h-2 overflow-hidden">
            <div
              className="bg-green-500 h-2 transition-all duration-300"
              style={{ width: `${(secondGuess / 1000) * 100}%` }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={restart}
        className="px-3 py-1 bg-gray-700 rounded"
      >
        Restart
      </button>
    </div>
  );
};

export default WpsMath;

