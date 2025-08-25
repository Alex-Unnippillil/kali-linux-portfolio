import React from 'react';

interface GameLayoutProps {
  title: string;
  score?: React.ReactNode;
  instructions?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({
  title,
  score,
  instructions,
  controls,
  children,
}) => {
  return (
    <div className="h-full w-full p-4 flex flex-col bg-ub-cool-grey text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {score && <div>{score}</div>}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {children}
      </div>
      {instructions && (
        <div className="mt-4 text-sm text-center">{instructions}</div>
      )}
      {controls && (
        <div className="mt-4 flex space-x-2 justify-center">{controls}</div>
      )}
    </div>
  );
};

export default GameLayout;
