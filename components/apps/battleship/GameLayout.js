import React from 'react';

const toastAccent = {
  info: 'from-cyan-500/90 via-sky-500/70 to-blue-500/60 border-cyan-300/70',
  success: 'from-emerald-500/90 via-teal-500/70 to-cyan-500/60 border-emerald-300/70',
  warning: 'from-amber-500/90 via-orange-500/70 to-yellow-500/60 border-amber-300/70',
  error: 'from-rose-600/90 via-red-600/80 to-orange-600/60 border-rose-300/70',
};

const Tooltip = ({ id, text, children }) => (
  <span className="relative inline-flex items-center group focus-within:z-10">
    {React.cloneElement(children, {
      ...children.props,
      'aria-describedby': id,
    })}
    <span
      role="tooltip"
      id={id}
      className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {text}
    </span>
  </span>
);

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
  onRestart,
  stats,
  showHeatmap,
  onToggleHeatmap,
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
              <span className="mb-1">Difficulty</span>
              <select
                className="rounded-lg border border-white/20 bg-slate-950/80 px-3 py-2 text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value)}
              >
                <option value="easy">Easy — Classic Salvo</option>
                <option value="medium">Medium — Tactical Salvo</option>
                <option value="hard">Hard — Monte Carlo</option>
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
                onClick={onToggleHeatmap}
              >
                {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
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
                  Fog of War
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
              <StatPill label="Phase" value={phase === 'placement' ? 'Deployment' : phase === 'battle' ? 'Engagement' : 'Debrief'} />
            </div>
            {battleLog ? (
              <p className="text-xs text-white/70">
                Last result: <span className="font-semibold text-white">{battleLog.lastResult ? battleLog.lastResult === 'victory' ? 'Victory' : 'Defeat' : '—'}</span>
                {battleLog.lastPlayed ? (
                  <span className="ml-1 text-white/60">
                    ({new Date(battleLog.lastPlayed).toLocaleString()})
                  </span>
                ) : null}
              </p>
            ) : null}
            {battleLog ? (
              <p className="text-xs text-white/70">
                Current streak: <span className="font-semibold text-white">{battleLog.streak}</span>{' '}
                · Best: <span className="font-semibold text-white">{battleLog.bestStreak}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-cyan-200/80">Ship Inventory</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {ships?.map((ship) => {
              const placed = Array.isArray(ship.cells) && ship.cells.length === ship.len;
              const isSelected = selectedShipId === ship.id;
              return (
                <li key={ship.id}>
                  <div
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                      isSelected
                        ? 'border-cyan-400/70 bg-cyan-500/20 shadow-[0_12px_24px_rgba(0,180,255,0.25)]'
                        : 'border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-cyan-500/10'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex flex-1 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      onClick={() => onSelectShip(ship.id)}
                    >
                      <span className="text-sm font-semibold text-white">{ship.name}</span>
                      <span className="text-xs uppercase tracking-wide text-white/60">Length {ship.len}</span>
                      <span
                        className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          placed
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-amber-500/20 text-amber-200'
                        }`}
                      >
                        {placed ? 'Deployed' : 'Awaiting orders'}
                      </span>
                    </button>
                    <Tooltip id={`rotate-${ship.id}`} text="Rotate ship">
                      <button
                        type="button"
                        className="rounded-lg border border-white/20 bg-slate-950/80 px-2 py-1 text-xs uppercase tracking-wide text-white/70 transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => onRotateShip(ship.id)}
                        disabled={!placed}
                      >
                        Rotate
                      </button>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
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
      `}</style>
    </div>
  );
};

export default GameLayout;
