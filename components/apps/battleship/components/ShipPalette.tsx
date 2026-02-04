import React from 'react';

const Tooltip = ({ id, text, children }: { id: string; text: string; children: React.ReactElement }) => {
  const child = children as React.ReactElement<Record<string, unknown>>;
  return (
    <span className="relative inline-flex items-center group focus-within:z-10">
      {React.cloneElement(child, {
        ...child.props,
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
};

type ShipLayout = {
  id: number;
  name: string;
  len: number;
  cells?: number[];
};

type ShipPaletteProps = {
  ships: ShipLayout[];
  selectedShipId: number | null;
  onSelectShip: (id: number) => void;
  onRotateShip: (id: number) => void;
  disabled?: boolean;
};

const ShipPalette = ({ ships, selectedShipId, onSelectShip, onRotateShip, disabled = false }: ShipPaletteProps) => (
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
                disabled={disabled}
              >
                <span className="text-sm font-semibold text-white">{ship.name}</span>
                <span className="text-xs uppercase tracking-wide text-white/60">Length {ship.len}</span>
                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    placed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
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
                  disabled={!placed || disabled}
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
);

export default ShipPalette;
