import { useState, useRef, useEffect } from 'react';

export interface DownloadCardProps {
  sha256: string;
}

export default function DownloadCard({ sha256 }: DownloadCardProps) {
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sha256);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } finally {
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="download-card">
      <div className="sha256-line">
        <span>SHA256: {sha256}</span>
        <button onClick={handleCopy} ref={buttonRef}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
