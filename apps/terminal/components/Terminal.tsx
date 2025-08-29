'use client';

import React, { forwardRef } from 'react';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={`text-white ${className}`}
      style={{ background: 'var(--kali-bg)', fontFamily: 'monospace', ...style }}
      {...props}
    />
  ),
);

Terminal.displayName = 'Terminal';

export default Terminal;
