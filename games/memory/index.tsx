'use client';

import React, { useMemo, useState } from 'react';
import GameShell from '../../components/games/GameShell.jsx';
import SizeSelector from './components/SizeSelector';
import { generateBoard } from './utils';

/**
 * Simplified memory game used in the demos directory. The game focuses on
 * demonstrating grid size selection and dynamic board generation rather than
 * providing a full featured experience.
 */
const MemoryGame: React.FC = () => {
  const [size, setSize] = useState(4);

  const cards = useMemo(() => generateBoard(size), [size]);

  return (
    <GameShell
      settings={<SizeSelector value={size} onChange={setSize} />}
    >
      <div
        className="grid gap-2 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`,
          width: `${size * 80}px`,
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="h-20 w-20 bg-gray-700 text-white flex items-center justify-center rounded"
          >
            {card}
          </div>
        ))}
      </div>
    </GameShell>
  );
};

export default MemoryGame;
