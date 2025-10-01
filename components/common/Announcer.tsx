import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type LiveRegionChannel = 'polite' | 'assertive';

export interface AnnouncerContextValue {
  announce: (message: string, channel?: LiveRegionChannel) => boolean;
  announcePolite: (message: string) => boolean;
  announceAssertive: (message: string) => boolean;
  clear: (channel?: LiveRegionChannel) => void;
}

const CLEAR_DELAY = 2000;

export const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

type TimerMap = Record<LiveRegionChannel, ReturnType<typeof setTimeout> | null>;
type MessageMap = Record<LiveRegionChannel, string>;

const resetTimers = (timers: TimerMap, channel: LiveRegionChannel) => {
  const timer = timers[channel];
  if (timer) {
    clearTimeout(timer);
    timers[channel] = null;
  }
};

const Announcer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const timersRef = useRef<TimerMap>({ polite: null, assertive: null });
  const lastMessageRef = useRef<MessageMap>({ polite: '', assertive: '' });

  const clearChannel = useCallback((channel: LiveRegionChannel) => {
    resetTimers(timersRef.current, channel);
    if (channel === 'polite') {
      setPoliteMessage('');
    } else {
      setAssertiveMessage('');
    }
    lastMessageRef.current[channel] = '';
  }, []);

  const clear = useCallback(
    (channel?: LiveRegionChannel) => {
      if (channel) {
        clearChannel(channel);
        return;
      }
      clearChannel('polite');
      clearChannel('assertive');
    },
    [clearChannel],
  );

  const setMessage = useCallback((channel: LiveRegionChannel, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return false;
    if (lastMessageRef.current[channel] === trimmed) return false;

    lastMessageRef.current[channel] = trimmed;
    if (channel === 'polite') setPoliteMessage(trimmed);
    else setAssertiveMessage(trimmed);

    resetTimers(timersRef.current, channel);
    timersRef.current[channel] = setTimeout(() => {
      if (channel === 'polite') setPoliteMessage('');
      else setAssertiveMessage('');
      lastMessageRef.current[channel] = '';
      timersRef.current[channel] = null;
    }, CLEAR_DELAY);

    return true;
  }, []);

  const announcePolite = useCallback(
    (message: string) => setMessage('polite', message),
    [setMessage],
  );

  const announceAssertive = useCallback(
    (message: string) => setMessage('assertive', message),
    [setMessage],
  );

  const announce = useCallback(
    (message: string, channel: LiveRegionChannel = 'polite') =>
      channel === 'assertive'
        ? setMessage('assertive', message)
        : setMessage('polite', message),
    [setMessage],
  );

  useEffect(() => () => clear(), [clear]);

  const value = useMemo(
    () => ({
      announce,
      announcePolite,
      announceAssertive,
      clear,
    }),
    [announce, announcePolite, announceAssertive, clear],
  );

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcer-polite"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcer-assertive"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
};

export default Announcer;
