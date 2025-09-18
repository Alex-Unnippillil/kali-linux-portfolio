'use client';

import React, { forwardRef } from 'react';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={`text-[var(--color-terminal-text)] ${className}`}
      style={{
        background: 'var(--color-terminal-bg)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--color-terminal-border)',
        boxShadow: '0 0 24px color-mix(in srgb, var(--color-terminal-border), transparent 60%)',
        color: 'var(--color-terminal-text)',
        fontFamily: 'monospace',
        fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
        lineHeight: 1.4,
        ...style,
      }}
      {...props}
    />
  ),
);

Terminal.displayName = 'Terminal';

export default Terminal;
