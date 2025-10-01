import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface UseStableInputOptions<T> {
  /**
   * Controlled value. When provided, the hook acts in controlled mode and
   * defers persistence to the caller via `onCommit`.
   */
  value?: T;
  /**
   * Initial value when operating in uncontrolled mode or as fallback when the
   * controlled value is undefined.
   */
  defaultValue?: T;
  /**
   * Debounce delay in milliseconds. Defaults to 150ms.
   */
  delay?: number;
  /**
   * Whether the first change in an idle period should commit immediately in
   * addition to the trailing update.
   */
  leading?: boolean;
  /**
   * Called whenever the debounced value commits. Useful for controlled usage
   * to lift state.
   */
  onCommit?: (value: T) => void;
}

type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type InputEvent<T> = ChangeEvent<InputElement> | T;
type Updater<T> = T | ((previous: T) => T);

const isEvent = <T,>(value: InputEvent<T>): value is ChangeEvent<InputElement> =>
  typeof value === 'object' && value !== null && 'target' in value;

const resolveUpdater = <T,>(updater: Updater<T>, previous: T): T =>
  typeof updater === 'function' ? (updater as (prev: T) => T)(previous) : updater;

function useStableInput<T>(options: UseStableInputOptions<T>) {
  const { delay = 150, leading = false, value, defaultValue } = options;
  const initialValueRef = useRef<T>(value ?? defaultValue ?? ('' as unknown as T));

  const isControlled = value !== undefined;
  const [liveValue, setLiveValue] = useState<T>(initialValueRef.current);
  const [internalCommitted, setInternalCommitted] = useState<T>(
    initialValueRef.current
  );
  const committedValue = isControlled ? (value as T) : internalCommitted;
  const [isDebouncing, setIsDebouncing] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  const lastValueRef = useRef<T>(initialValueRef.current);
  const liveValueRef = useRef<T>(initialValueRef.current);

  const latestOnCommit = useRef(options.onCommit);
  useEffect(() => {
    latestOnCommit.current = options.onCommit;
  }, [options.onCommit]);

  useEffect(() => {
    liveValueRef.current = liveValue;
  }, [liveValue]);

  useEffect(() => {
    if (isControlled) {
      setLiveValue(value as T);
      setInternalCommitted(value as T);
      lastValueRef.current = value as T;
      liveValueRef.current = value as T;
    }
  }, [isControlled, value]);

  const commitValue = useCallback(
    (next: T) => {
      if (!isControlled) {
        setInternalCommitted(next);
      }
      latestOnCommit.current?.(next);
    },
    [isControlled]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = false;
    setIsDebouncing(false);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const next = pendingRef.current ? lastValueRef.current : liveValueRef.current;
    pendingRef.current = false;
    setIsDebouncing(false);
    commitValue(next);
  }, [commitValue]);

  const scheduleCommit = useCallback(
    (next: T) => {
      lastValueRef.current = next;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (leading && !pendingRef.current) {
        commitValue(next);
      }

      pendingRef.current = true;
      setIsDebouncing((prev) => (prev ? prev : true));

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        pendingRef.current = false;
        setIsDebouncing(false);
        commitValue(lastValueRef.current);
      }, delay);
    },
    [commitValue, delay, leading]
  );

  const setInputValue = useCallback(
    (updater: Updater<T>) => {
      setLiveValue((prev) => {
        const next = resolveUpdater(updater, prev);
        if (Object.is(prev, next)) {
          return prev;
        }
        scheduleCommit(next);
        return next;
      });
    },
    [scheduleCommit]
  );

  const handleChange = useCallback(
    (eventOrValue: InputEvent<T>) => {
      if (isEvent(eventOrValue)) {
        const target = eventOrValue.target as InputElement;
        setInputValue(target.value as unknown as T);
      } else {
        setInputValue(eventOrValue as T);
      }
    },
    [setInputValue]
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(
    () => ({
      value: committedValue,
      inputValue: liveValue,
      isDebouncing,
      onChange: handleChange,
      setInputValue,
      flush,
      cancel,
    }),
    [committedValue, liveValue, isDebouncing, handleChange, setInputValue, flush, cancel]
  );
}

export default useStableInput;
