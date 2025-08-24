import { useState } from 'react';

/**
 * Simple toast/logger hook. Logs messages to console and exposes
 * a transient message state for UI display.
 */
export function useToastLogger(duration = 3000) {
  const [message, setMessage] = useState<string | null>(null);

  const toast = (msg: string) => {
    console.log(msg);
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  };

  return { message, toast };
}
