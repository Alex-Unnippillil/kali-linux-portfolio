'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DiffMergeDialog from '../components/common/DiffMergeDialog';
import { HunkSelection } from '../utils/diffMerge';

export type ConflictSource = 'snapshot' | 'gist';

export interface ConflictResolutionMeta {
  selection: Record<string, HunkSelection>;
  hunks: number;
  manualEdits: boolean;
  source: ConflictSource;
  key: string;
}

export interface ConflictDetail {
  key: string;
  base: string;
  local: string;
  incoming: string;
  metadata?: Record<string, unknown>;
  description?: string;
  apply: (merged: string, meta?: ConflictResolutionMeta) => void;
  onCancel?: () => void;
}

interface ActiveConflict extends ConflictDetail {
  source: ConflictSource;
}

type Logger = (event: string, payload: Record<string, unknown>) => void;

const defaultLogger: Logger = (event, payload) => {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`[sync-conflict] ${event}`, payload);
  }
};

interface UseSyncConflictsOptions {
  logger?: Logger;
}

export interface UseSyncConflictsResult {
  dialog: React.ReactElement | null;
  trigger: (detail: ActiveConflict) => void;
}

const eventNames: Record<ConflictSource, string> = {
  snapshot: 'snapshot-sync-conflict',
  gist: 'gist-sync-conflict',
};

const useSyncConflicts = ({ logger = defaultLogger }: UseSyncConflictsOptions = {}): UseSyncConflictsResult => {
  const [conflict, setConflict] = useState<ActiveConflict | null>(null);
  const applyRef = useRef<ActiveConflict['apply'] | null>(null);
  const loggerRef = useRef(logger);
  loggerRef.current = logger;

  const openConflict = useCallback((detail: ActiveConflict) => {
    applyRef.current = detail.apply;
    setConflict(detail);
    loggerRef.current('conflict-detected', {
      key: detail.key,
      source: detail.source,
      metadata: detail.metadata,
    });
  }, []);

  const handleEvent = useCallback(
    (source: ConflictSource) =>
      (event: Event) => {
        const custom = event as CustomEvent<ConflictDetail>;
        if (!custom.detail) return;
        openConflict({ ...custom.detail, source });
      },
    [openConflict],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const cleanup: Array<() => void> = [];
    (Object.keys(eventNames) as ConflictSource[]).forEach((source) => {
      const name = eventNames[source];
      const handler = handleEvent(source);
      window.addEventListener(name, handler as EventListener);
      cleanup.push(() => window.removeEventListener(name, handler as EventListener));
    });
    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [handleEvent]);

  const closeConflict = useCallback(() => {
    if (!conflict) return;
    conflict.onCancel?.();
    loggerRef.current('conflict-dismissed', {
      key: conflict.key,
      source: conflict.source,
    });
    setConflict(null);
    applyRef.current = null;
  }, [conflict]);

  const dialog = useMemo(() => {
    if (!conflict) return null;
    return (
      <DiffMergeDialog
        isOpen
        baseContent={conflict.local}
        incomingContent={conflict.incoming}
        entityLabel={conflict.description ?? conflict.key}
        source={conflict.source === 'snapshot' ? 'Snapshot sync' : 'Gist sync'}
        leftLabel="Current"
        rightLabel="Incoming"
        onClose={closeConflict}
        logger={(event, payload) =>
          loggerRef.current(event, {
            ...payload,
            source: conflict.source,
            key: conflict.key,
          })
        }
        onApply={(merged, meta) => {
          applyRef.current?.(merged, {
            ...meta,
            key: conflict.key,
            source: conflict.source,
          });
          setConflict(null);
          applyRef.current = null;
        }}
        title="Resolve sync conflict"
      />
    );
  }, [conflict, closeConflict]);

  return { dialog, trigger: openConflict };
};

export default useSyncConflicts;

