'use client';

import React, { forwardRef } from 'react';
import { kaliTheme } from '../../../styles/themes/kali';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => (
    <div
      ref={ref}
      data-testid="xterm-container"
      className={className}
      style={{
        backgroundColor: kaliTheme.background,
        color: kaliTheme.text,
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
