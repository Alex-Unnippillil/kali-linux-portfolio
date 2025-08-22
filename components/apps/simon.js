import React, { useState, useRef, useEffect } from 'react';

const padColors = [
  { base: 'bg-green-700', active: 'bg-green-500' },
  { base: 'bg-red-700', active: 'bg-red-500' },
  { base: 'bg-yellow-500', active: 'bg-yellow-300' },
  { base: 'bg-blue-700', active: 'bg-blue-500' },
];

const tones = [329.63, 261.63, 220, 164.81];

const Simon = () => {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activePad, setActivePad] = useState(null);
  const [status, setStatus] = useState('Press Start');
  const audioCtx = useRef(null);

  const playTone = (freq) => {
    const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.current = ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    oscillator.stop(ctx.currentTime + 0.5);
  };

  const flashPad = (idx) => {
    setActivePad(idx);
    playTone(tones[idx]);
    setTimeout(() => setActivePad(null), 500);
  };

  const playSequence = async () => {
    setIsPlayerTurn(false);
    setStatus('Listen...');
    for (let i = 0; i < sequence.length; i++) {
      flashPad(sequence[i]);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setStatus('Your turn');
    setIsPlayerTurn(true);
    setStep(0);
  };

  useEffect(() => {
    if (sequence.length && !isPlayerTurn) {
      playSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);

  const startGame = () => {
    setSequence([Math.floor(Math.random() * 4)]);
    setStatus('Listen...');
  };

  const handlePadClick = (idx) => {
    if (!isPlayerTurn) return;
    flashPad(idx);
    if (sequence[step] === idx) {
      if (step + 1 === sequence.length) {
        setIsPlayerTurn(false);
        setTimeout(() => {
          setSequence((seq) => [...seq, Math.floor(Math.random() * 4)]);
        }, 1000);
      } else {
        setStep(step + 1);
      }
    } else {
      setStatus('Wrong! Press Start');
      setSequence([]);
      setIsPlayerTurn(false);
      setStep(0);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {padColors.map((pad, idx) => (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={`h-24 w-24 rounded ${
              activePad === idx ? pad.active : pad.base
            }`}
            onClick={() => handlePadClick(idx)}
          />
        ))}
      </div>
      <div className="mb-4">{status}</div>
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={startGame}
      >
        Start
      </button>
    </div>
  );
};

export default Simon;
