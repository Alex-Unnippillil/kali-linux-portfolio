import React from 'react';

export type SeparatorMode = 'line' | 'space' | 'expand';

interface SeparatorProps {
  mode?: SeparatorMode;
  className?: string;
}

/**
 * Flexible separator used inside panel layouts. Supports three modes:
 *  - `line`: renders a thin divider line.
 *  - `space`: provides fixed empty space with responsive width.
 *  - `expand`: grows to consume remaining horizontal space.
 *
 * The component is responsive – space and margins scale on smaller screens
 * to preserve layout fidelity.
 */
export default function Separator({ mode = 'line', className = '' }: SeparatorProps) {
  switch (mode) {
    case 'space':
      return <div className={`shrink-0 w-2 sm:w-4 ${className}`} aria-hidden="true" />;
    case 'expand':
      return <div className={`flex-grow ${className}`} aria-hidden="true" />;
    case 'line':
    default:
      return (
        <div
          className={`shrink-0 h-4 mx-1 sm:mx-2 border-l border-white/30 ${className}`}
          aria-hidden="true"
        />
      );
  }
}
