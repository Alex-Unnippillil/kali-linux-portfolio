import usePersistentState from '../../hooks/usePersistentState';

export function useQuoteNotification() {
  const [time, setTime] = usePersistentState<string>(
    'quote-notify-time',
    '09:00',
    (v): v is string => typeof v === 'string',
  );
  const [enabled, setEnabled] = usePersistentState<boolean>(
    'quote-notify-enabled',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );
  return { time, setTime, enabled, setEnabled } as const;
}

