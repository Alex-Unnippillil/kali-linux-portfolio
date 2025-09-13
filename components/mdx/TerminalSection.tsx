import React, { ReactNode } from 'react';
import TerminalOutput from '../TerminalOutput';

interface TerminalSectionProps {
  children: ReactNode;
  ariaLabel?: string;
}

function toText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(toText).join('');
  return '';
}

export default function TerminalSection({ children, ariaLabel }: TerminalSectionProps) {
  const text = toText(children);
  return <TerminalOutput text={text} ariaLabel={ariaLabel} />;
}
