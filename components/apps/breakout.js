import React from 'react';
import GameLayout from './GameLayout';

const Breakout = () => (
  <GameLayout>
    <iframe
      src="/apps/breakout/index.html"
      title="Breakout"
      className="w-full h-full"
      frameBorder="0"
    />
  </GameLayout>
);

export default Breakout;
