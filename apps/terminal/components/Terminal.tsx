'use client';

import React, { forwardRef } from 'react';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={`bg-black text-[#f8f8f2] selection:bg-blue-600 selection:text-white ${className}`}
      style={{
        backgroundColor: '#000000',
        color: '#f8f8f2',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(23, 147, 209, 0.35)',
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
