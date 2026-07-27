'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SSEConsole = () => {
  const [lines, setLines] = useState<string[]>([]);
  const preRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/sse');

    const handleMessage = (event: MessageEvent<string>) => {
      setLines((prev) => [...prev, event.data]);
    };

    const handleError = () => {
      source.close();
    };

    source.addEventListener('message', handleMessage);
    source.addEventListener('error', handleError);

    return () => {
      source.removeEventListener('message', handleMessage);
      source.removeEventListener('error', handleError);
      source.close();
    };
  }, []);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [lines]);

  const content = useMemo(() => {
    if (lines.length === 0) {
      return 'Waiting for server-sent events...';
    }

    return lines.join('\n');
  }, [lines]);

  return (
    <div className="h-full w-full">
      <pre
        ref={preRef}
        className="h-full max-h-64 overflow-auto rounded bg-black/80 p-4 text-sm text-lime-300"
        aria-live="polite"
      >
        {content}
      </pre>
    </div>
  );
};

export default SSEConsole;
