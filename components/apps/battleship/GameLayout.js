import React from 'react';
import ShipPalette from './components/ShipPalette';

const toastAccent = {
  info: 'from-cyan-500/90 via-sky-500/70 to-blue-500/60 border-cyan-300/70',
  success: 'from-emerald-500/90 via-teal-500/70 to-cyan-500/60 border-emerald-300/70',
  warning: 'from-amber-500/90 via-orange-500/70 to-yellow-500/60 border-amber-300/70',
  error: 'from-rose-600/90 via-red-600/80 to-orange-600/60 border-rose-300/70',
};

const StatPill = ({ label, value }) => (
  <div className="flex flex-col rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-wide">
    <span className="text-[10px] text-white/60">{label}</span>
    <span className="text-lg font-semibold text-white">{value}</span>
  </div>
);

const GameLayout = ({
  children,
  difficulty,
  onDifficultyChange,
  mode,
  onModeChange,
  onRestart,
  stats,
  showGuessHeat,
  onToggleGuessHeat,
  showAiHeat,
  onToggleAiHeat,
  salvo,
  onSalvoChange,
  fog,
  onFogChange,
  noTouch,
  onNoTouchChange,
  colorblind,
  onColorblindChange,
  toast,
  onDismissToast,
  ships,
  onRotateShip,
  onSelectShip,
  selectedShipId,
  phase,
  battleLog,
  onResetStats,
  helpStats,
}) => {
  const toastClass = toast ? toastAccent[toast.type] ?? toastAccent.info : '';

  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-4 overflow-auto bg-ub-cool-grey p-4 font-ubuntu text-white">
      {toast ? (
        <div
          className={`relative w-full max-w-4xl rounded-2xl border px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur transition-opacity duration-300 ${toastClass}`}
          role="status"
          aria-live="assertive"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/70">{toast.title}</p>
              <p className="text-base font-medium text-white">{toast.message}</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/20 bg-black/20 px-2 py-1 text-xs uppercase tracking-wide text-white/70 transition hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={onDismissToast}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <section className="w-full max-w-5xl space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_30px_60px_rgba(5,12,40,0.45)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-2/3">
            <label className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-3 text-xs uppercase tracking-wide text-white/70">
              <span className="mb-1">Game Mode</span>
              <select
                className="rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={mode}
                onChange={(e) => onModeChange(e.target.value)}
              >
                <option value="ai">Vs AI</option>
                <option value="hotseat">Local two-player (hotseat)</option>
              </select>
            </label>
            <label className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-3 text-xs uppercase tracking-wide text-white/70">
              <span className="mb-1">Difficulty</span>
              <select
                className="rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value)}
                disabled={mode !== 'ai'}
              >
                <option value="easy">Easy — Patrol AI</option>
                <option value="medium">Medium — Tactical AI</option>
                <option value="hard">Hard — Monte Carlo AI</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <button
                type="button"
                className="flex-1 rounded-lg bg-gradient-to-br from-cyan-500/90 to-blue-600/90 px-3 py-2 text-sm font-semibold uppercase tracking-wide shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={onRestart}
              >
                Reset Grid
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-cyan-400/60 bg-slate-950/70 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-cyan-200 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={() => onToggleGuessHeat(!showGuessHeat)}
                disabled={mode !== 'ai'}
              >
                {showGuessHeat ? 'Hide Targeting Heatmap' : 'Show Targeting Heatmap'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2">
                <input
                  id="battleship-salvo"
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={salvo}
                  onChange={(e) => onSalvoChange(e.target.checked)}
                  aria-label="Toggle salvo mode"
                />
                <label htmlFor="battleship-salvo" className="cursor-pointer text-sm text-white/80">
                  Salvo Mode
                </label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2">
                <input
                  id="battleship-heat-ai"
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={showAiHeat}
                  onChange={(e) => onToggleAiHeat(e.target.checked)}
                  aria-label="Toggle enemy prediction heatmap"
                  disabled={mode !== 'ai'}
                />
                <label htmlFor="battleship-heat-ai" className="cursor-pointer text-sm text-white/80">
                  Enemy prediction heatmap (cheat)
                </label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2">
                <input
                  id="battleship-no-touch"
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={noTouch}
                  onChange={(e) => onNoTouchChange(e.target.checked)}
                  aria-label="Toggle no-touch adjacency rule"
                />
                <label htmlFor="battleship-no-touch" className="cursor-pointer text-sm text-white/80">
                  Enforce No-Touch Rule
                </label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2">
                <input
                  id="battleship-fog"
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={fog}
                  onChange={(e) => onFogChange(e.target.checked)}
                  aria-label="Toggle fog of war"
                />
                <label htmlFor="battleship-fog" className="cursor-pointer text-sm text-white/80">
                  Hide my fleet during battle
                </label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2">
                <input
                  id="battleship-colorblind"
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={colorblind}
                  onChange={(e) => onColorblindChange(e.target.checked)}
                  aria-label="Toggle colorblind assist"
                />
                <label htmlFor="battleship-colorblind" className="cursor-pointer text-sm text-white/80">
                  Colorblind Assist
                </label>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-950/90 p-3 lg:w-1/3">
            <p className="text-xs uppercase tracking-wide text-white/60">Battle Brief</p>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Wins" value={stats?.wins ?? 0} />
              <StatPill label="Losses" value={stats?.losses ?? 0} />
              <StatPill label="Shots" value={stats?.shotsFired ?? 0} />
              <StatPill label="Hit rate" value={`${helpStats?.hitRate ?? 0}%`} />
              <StatPill label="Avg turns" value={helpStats?.avgTurns ?? 0} />
              <StatPill label="Phase" value={phase === 'placement' ? 'Deployment' : phase === 'battle' ? 'Engagement' : 'Debrief'} />
            </div>
            {battleLog ? (
              <p className="text-xs text-white/70">
                Last result: <span className="font-semibold text-white">{battleLog.lastResult ? battleLog.lastResult : '—'}</span>
                {battleLog.lastPlayed ? (
                  <span className="ml-1 text-white/60">
                    ({new Date(battleLog.lastPlayed).toLocaleString()})
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="text-xs text-white/70">
              Current streak: <span className="font-semibold text-white">{stats?.currentStreak ?? 0}</span>{' '}
              · Best: <span className="font-semibold text-white">{stats?.bestStreak ?? 0}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>Hotseat wins:</span>
              <span className="font-semibold text-white">P1 {stats?.player1Wins ?? 0}</span>
              <span className="font-semibold text-white">P2 {stats?.player2Wins ?? 0}</span>
            </div>
            <button
              type="button"
              className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-xs uppercase tracking-wide text-rose-100 transition hover:bg-rose-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              onClick={onResetStats}
            >
              Reset stats
            </button>
          </div>
        </div>

        <ShipPalette
          ships={ships}
          selectedShipId={selectedShipId}
          onSelectShip={onSelectShip}
          onRotateShip={onRotateShip}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          <p className="mb-2 text-xs uppercase tracking-wide text-cyan-200/80">Controls</p>
          <ul className="space-y-1">
            <li><strong>Keyboard:</strong> arrows move cursor, Enter selects/place, R rotates, F fires, Esc clears selection.</li>
            <li><strong>Touch:</strong> tap ship to select, tap grid to place/target, use Rotate and Fire buttons.</li>
            <li><strong>Mouse:</strong> drag ships to place, click cells to target.</li>
          </ul>
        </div>
      </section>

      <div className="flex w-full max-w-5xl flex-1 flex-col items-center gap-4">{children}</div>

      <style jsx global>{`
        .battle-card {
          perspective: 1600px;
        }

        .battle-card .board-surface {
          border-radius: 1.25rem;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
          transform: rotateX(6deg) rotateY(-4deg) translateY(0);
          transition: transform 0.5s ease, box-shadow 0.5s ease;
          will-change: transform, box-shadow;
        }

        .battle-card:hover .board-surface,
        .battle-card:focus-within .board-surface {
          transform: rotateX(0deg) rotateY(0deg) translateY(-8px);
          box-shadow: 0 45px 80px rgba(0, 200, 255, 0.25);
        }

        @media (prefers-reduced-motion: reduce) {
          .battle-card .board-surface {
            transform: none !important;
            transition: none !important;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
          }
        }
      `}</style>
    </div>
  );
};

export default GameLayout;
