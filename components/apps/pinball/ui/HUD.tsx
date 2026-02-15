import type { EngineSnapshot } from '../types';

export function HUD({ snapshot, showDebug }: { snapshot: EngineSnapshot; showDebug: boolean }) {
  return (
    <>
      <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">Score {snapshot.score}</div>
      <div className="absolute left-2 top-9 rounded bg-black/60 px-2 py-1 text-xs text-white">Ball {snapshot.currentBall} / 3</div>
      <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">x{snapshot.multiplier}</div>
      <div className="absolute right-2 top-9 rounded bg-black/60 px-2 py-1 text-xs text-white">Save {snapshot.ballSaveRemaining.toFixed(1)}s</div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white">{snapshot.statusMessage}</div>
      {showDebug && (
        <div className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-[10px] text-green-300">
          FPS {snapshot.debug.fps.toFixed(0)} · Step {snapshot.debug.physicsMs.toFixed(2)}ms · Bodies {snapshot.debug.bodies} · Contacts {snapshot.debug.contacts}
        </div>
      )}
    </>
  );
}
