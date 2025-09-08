'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import ShortcutModal from '@/components/keyboard/ShortcutModal';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => {
    const [showShortcuts, setShowShortcuts] = useState(false);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === '?') {
          e.preventDefault();
          setShowShortcuts(true);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
      <>
        <div
          ref={ref}
          data-testid="xterm-container"
          className={className}
          style={{
            background: 'var(--kali-bg)',
            fontFamily: 'monospace',
            fontSize: 'clamp(1rem, 0.6vw + 1rem, 1.1rem)',
            lineHeight: 1.4,
            whiteSpace: 'pre',
            ...style,
          }}
          {...props}
        />
        <ShortcutModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </>
    );
  },
);

Terminal.displayName = 'Terminal';

export default Terminal;
