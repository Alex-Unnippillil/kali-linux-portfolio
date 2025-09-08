'use client';

import React, { forwardRef, useState } from 'react';
import {
  PROMPT_PRESETS,
  PromptPreset,
  usePromptPreset,
} from '../state';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.06a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.06a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.06a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const Terminal = forwardRef<HTMLDivElement, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => {
    const [preset, setPreset] = usePromptPreset();
    const [open, setOpen] = useState(false);
    return (
      <div className="relative">
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
        <button
          aria-label="Prompt settings"
          onClick={() => setOpen((o) => !o)}
          className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded"
        >
          <CogIcon />
        </button>
        {open && (
          <div className="absolute top-6 right-1 z-20 bg-gray-800 text-white border border-gray-700 rounded text-xs">
            {Object.keys(PROMPT_PRESETS).map((key) => (
              <button
                key={key}
                className={`block w-full text-left px-2 py-1 hover:bg-gray-700 ${
                  preset === key ? 'bg-gray-700' : ''
                }`}
                onClick={() => {
                  setPreset(key as PromptPreset);
                  setOpen(false);
                }}
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

Terminal.displayName = 'Terminal';

export default Terminal;
