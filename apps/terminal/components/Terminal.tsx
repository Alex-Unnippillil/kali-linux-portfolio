'use client';

import React, { forwardRef } from 'react';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={`text-white font-mono ${className}`}
      style={{
        background: 'var(--kali-bg)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--color-border)',
        fontFamily: 'var(--font-family-mono)',
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
