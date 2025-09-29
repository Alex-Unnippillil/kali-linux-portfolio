import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type PolitenessSetting = 'polite' | 'assertive';

type LiveRegionContextValue = {
  announce: (message: string, politeness?: PolitenessSetting) => void;
};

export type LiveRegionProviderProps = {
  children: ReactNode;
};

const LiveRegionContext = createContext<LiveRegionContextValue | undefined>(undefined);

const visuallyHidden: CSSProperties = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
  whiteSpace: 'nowrap',
};

export const LiveRegionProvider = ({ children }: LiveRegionProviderProps) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const politeTimer = useRef<ReturnType<typeof setTimeout>>();
  const assertiveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (politeTimer.current) {
        clearTimeout(politeTimer.current);
      }
      if (assertiveTimer.current) {
        clearTimeout(assertiveTimer.current);
      }
    };
  }, []);

  const announce = useCallback(
    (message: string, politeness: PolitenessSetting = 'polite') => {
      const setMessage = politeness === 'assertive' ? setAssertiveMessage : setPoliteMessage;
      const timerRef = politeness === 'assertive' ? assertiveTimer : politeTimer;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage('');
      timerRef.current = setTimeout(() => {
        setMessage(message);
      }, 10);
    },
    [],
  );

  const value = useMemo<LiveRegionContextValue>(() => ({ announce }), [announce]);

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={visuallyHidden}
        data-live-region="polite"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={visuallyHidden}
        data-live-region="assertive"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
};

type UseLiveRegionOptions = {
  politeness?: PolitenessSetting;
};

export const useLiveRegion = ({ politeness = 'polite' }: UseLiveRegionOptions = {}) => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }

  const announce = useCallback(
    (message: string) => {
      context.announce(message, politeness);
    },
    [context, politeness],
  );

  return { announce };
};
