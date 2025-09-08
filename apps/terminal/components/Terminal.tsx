'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SessionRecorder, {
  SessionEvent,
} from '../../../lib/session-recorder';

export type TerminalContainerProps = React.HTMLAttributes<HTMLDivElement>;

export interface TerminalRecorderHandle extends HTMLDivElement {
  startRecording: () => void;
  stopRecording: () => void;
  recordInput: (data: string) => void;
  recordOutput: (data: string) => void;
  getRecording: () => SessionEvent[];
}

const Terminal = forwardRef<TerminalRecorderHandle, TerminalContainerProps>(
  ({ style, className = '', ...props }, ref) => {
    const divRef = useRef<HTMLDivElement>(null);
    const recorderRef = useRef<SessionRecorder | null>(null);

    const startRecording = () => {
      recorderRef.current = new SessionRecorder();
    };

    const stopRecording = () => {
      recorderRef.current?.download();
    };

    const recordInput = (data: string) => {
      recorderRef.current?.recordInput(data);
    };

    const recordOutput = (data: string) => {
      recorderRef.current?.recordOutput(data);
    };

    const getRecording = () => recorderRef.current?.getEvents() ?? [];

    useImperativeHandle(ref, () =>
      Object.assign(divRef.current as HTMLDivElement, {
        startRecording,
        stopRecording,
        recordInput,
        recordOutput,
        getRecording,
      }),
    );

    return (
      <div
        ref={divRef}
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
    );
  },
);

Terminal.displayName = 'Terminal';

export default Terminal;
