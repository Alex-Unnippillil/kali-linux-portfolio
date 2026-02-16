export function Menus({ paused, gameOver, onNewGame, onResume, onToggleHelp }: { paused: boolean; gameOver: boolean; onNewGame: () => void; onResume: () => void; onToggleHelp: () => void; }) {
  return (
    <div className="flex gap-2 text-xs">
      <button className="rounded bg-ub-orange px-2 py-1 text-black" onClick={onNewGame}>New Game</button>
      {paused && !gameOver && <button className="rounded bg-slate-200 px-2 py-1 text-black" onClick={onResume}>Resume</button>}
      <button className="rounded bg-slate-700 px-2 py-1 text-white" onClick={onToggleHelp}>Help</button>
    </div>
  );
}
