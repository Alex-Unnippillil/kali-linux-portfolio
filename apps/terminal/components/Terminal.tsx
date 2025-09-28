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
        background: 'var(--terminal-background)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--terminal-border, var(--color-border))',
        color: 'var(--terminal-foreground)',
        fontFamily: 'var(--terminal-font-family)',
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
