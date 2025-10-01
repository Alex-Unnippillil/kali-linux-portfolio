import React from 'react';

type MenuRowProps = {
  icon?: React.ReactNode;
  label: React.ReactNode;
  accel?: string | null;
};

const MenuRow: React.FC<MenuRowProps> = ({ icon, label, accel }) => {
  return (
    <span className="flex w-full items-center justify-between gap-3 px-4">
      <span className="flex min-w-0 items-center gap-2 text-sm text-current">
        {icon ? <span className="shrink-0" aria-hidden>{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      {accel ? (
        <span
          className="ml-4 shrink-0 text-[11px] font-medium tabular-nums"
          style={{ color: 'var(--color-text)', opacity: 0.75 }}
        >
          {accel}
        </span>
      ) : null}
    </span>
  );
};

export default MenuRow;
