import React from 'react';

interface TitleBarProps {
  title: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  grabbed?: boolean;
}

export default function TitleBar({ title, onKeyDown, onBlur, grabbed }: TitleBarProps) {
  return (
    <button
      type="button"
      className="relative bg-ub-window-title border-t-2 border-white border-opacity-5 px-3 text-white w-full select-none rounded-b-none flex items-center h-11"
      tabIndex={0}
      aria-grabbed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div
        data-testid="titlebar"
        className="flex justify-center w-full text-sm font-bold"
        style={{ fontFamily: 'system-ui', letterSpacing: '0.05em' }}
      >
        {title}
      </div>
    </button>
  );
}
