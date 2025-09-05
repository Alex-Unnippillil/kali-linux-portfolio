import React, { cloneElement, useId } from 'react';

interface TooltipProps {
  children: React.ReactElement;
  label: React.ReactNode;
}

export default function Tooltip({ children, label }: TooltipProps) {
  const id = useId();
  const trigger = cloneElement(children, {
    tabIndex: children.props.tabIndex ?? 0,
    'aria-describedby': id,
  });

  return (
    <span className="relative inline-block group">
      {trigger}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded bg-gray-700 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

