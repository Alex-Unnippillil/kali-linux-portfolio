'use client';

import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { DEFAULT_SAMPLES, EXAMPLE_PACKETS } from '../constants';
import applyFilters from '../utils/applyFilters';

export interface LintMessage {
  line: number;
  message: string;
}

interface EttercapFilterContextValue {
  filterText: string;
  setFilterText: (value: string) => void;
  beforePackets: readonly string[];
  filteredPackets: readonly string[];
  lintMessages: LintMessage[];
  isLinting: boolean;
}

const EttercapFilterContext = createContext<EttercapFilterContextValue | null>(
  null,
);

export const EttercapFilterProvider = ({
  children,
}: PropsWithChildren<unknown>) => {
  const [filterText, setFilterText] = usePersistentState(
    'ettercap-filter-text',
    DEFAULT_SAMPLES[0].code,
  );
  const [lintMessages, setLintMessages] = useState<LintMessage[]>([]);
  const [isLinting, setIsLinting] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const worker = new Worker(new URL('../filterLint.worker.ts', import.meta.url));
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<{ type: string; messages: LintMessage[] }>) => {
      if (event.data?.type !== 'lint') return;
      setLintMessages(event.data.messages);
      setIsLinting(false);
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    setIsLinting(true);
    worker.postMessage({ type: 'lint', code: filterText });
  }, [filterText]);

  const filteredPackets = useMemo(
    () => applyFilters(filterText, EXAMPLE_PACKETS),
    [filterText],
  );

  const value = useMemo<EttercapFilterContextValue>(
    () => ({
      filterText,
      setFilterText,
      beforePackets: EXAMPLE_PACKETS,
      filteredPackets,
      lintMessages,
      isLinting,
    }),
    [filterText, filteredPackets, lintMessages, isLinting, setFilterText],
  );

  return (
    <EttercapFilterContext.Provider value={value}>
      {children}
    </EttercapFilterContext.Provider>
  );
};

export const useEttercapFilterState = () => {
  const ctx = useContext(EttercapFilterContext);
  if (!ctx) {
    throw new Error('useEttercapFilterState must be used within EttercapFilterProvider');
  }
  return ctx;
};
