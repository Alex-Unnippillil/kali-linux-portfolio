'use client';

import React, { forwardRef } from 'react';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={`text-white ${className}`}
      style={{
        background: 'var(--kali-bg)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--color-border)',
        fontFamily: 'monospace',
        fontSize:
          'var(--terminal-font-size, clamp(0.65rem, 0.35vw + 0.75rem, 1rem))',
        lineHeight: 'var(--terminal-line-height, 1.35)',
        overflowX: 'hidden',
        ...style,
      }}
      {...props}
    />
  ),
);

Terminal.displayName = 'Terminal';

export default Terminal;
