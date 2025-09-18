'use client';

import { useState } from 'react';
import copyToClipboard from '../../utils/clipboard';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

const resetAfter = 1600;

export default function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await copyToClipboard(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), resetAfter);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`design-copy-trigger ${className}`.trim()}
      data-copied={copied}
      aria-label={copied ? 'Copied to clipboard' : label}
    >
      <span>{copied ? 'Copied' : label}</span>
      <span aria-hidden="true">{copied ? '✅' : '📋'}</span>
    </button>
  );
}
