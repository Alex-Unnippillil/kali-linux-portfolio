import { useCallback, useEffect, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { sendEmail } from './utils/sendEmail';

interface Draft {
  name: string;
  email: string;
  message: string;
}

type Status = 'idle' | 'queued' | 'sending' | 'sent' | 'error';

export const useContactState = () => {
  const [draft, setDraft, resetDraft] = usePersistentState<Draft>(
    'contact-draft',
    { name: '', email: '', message: '' },
  );
  const [status, setStatus] = useState<Status>('idle');
  const [queued, setQueued] = useState(false);

  const attemptSend = useCallback(async () => {
    try {
      setStatus('sending');
      await sendEmail(draft);
      setStatus('sent');
      resetDraft();
    } catch {
      setStatus('error');
    }
  }, [draft, resetDraft]);

  const send = useCallback(() => {
    if (!navigator.onLine) {
      setStatus('queued');
      setQueued(true);
      return;
    }
    void attemptSend();
  }, [attemptSend]);

  useEffect(() => {
    if (!queued) return;
    const handleOnline = () => {
      setQueued(false);
      void attemptSend();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queued, attemptSend]);

  return {
    draft,
    setDraft,
    send,
    status,
    reset: resetDraft,
  } as const;
};

export type ContactState = ReturnType<typeof useContactState>;

