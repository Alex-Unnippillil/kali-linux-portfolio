import { useCallback, useMemo, useRef, useState } from 'react';
import { assessFileSafety, createFileSafetySession, type FileLike, type FileRiskAssessment } from '../utils/fileSafety';

type PendingRequest = {
  file: FileLike;
  risk: FileRiskAssessment;
  resolve: (decision: boolean) => void;
  onProceed?: () => Promise<void> | void;
  meta?: Record<string, unknown>;
};

export interface FileSafetyModalProps {
  open: boolean;
  fileName: string;
  risk?: FileRiskAssessment;
  onProceed: () => void;
  onCancel: () => void;
}

export function useFileSafetyPrompt(context: string) {
  const sessionRef = useRef(createFileSafetySession({ context }));
  const [pending, setPending] = useState<PendingRequest | null>(null);

  const requestFileAccess = useCallback(
    async (file: FileLike, onProceed?: () => Promise<void> | void, meta?: Record<string, unknown>) => {
      const risk = assessFileSafety(file);
      if (!risk.isRisky || sessionRef.current.hasConsent(file)) {
        if (onProceed) await onProceed();
        return true;
      }

      return await new Promise<boolean>((resolve) => {
        setPending({ file, risk, resolve, onProceed, meta });
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    if (!pending) return;
    sessionRef.current.recordDecision(pending.file, 'cancel', { risk: pending.risk, meta: pending.meta });
    pending.resolve(false);
    setPending(null);
  }, [pending]);

  const proceed = useCallback(async () => {
    if (!pending) return;
    sessionRef.current.recordDecision(pending.file, 'proceed', { risk: pending.risk, meta: pending.meta });
    try {
      if (pending.onProceed) {
        await pending.onProceed();
      }
      pending.resolve(true);
    } finally {
      setPending(null);
    }
  }, [pending]);

  const modalProps: FileSafetyModalProps = useMemo(
    () => ({
      open: !!pending,
      fileName: pending?.file?.name ?? 'Unknown file',
      risk: pending?.risk,
      onProceed: proceed,
      onCancel: cancel,
    }),
    [pending, proceed, cancel],
  );

  return {
    requestFileAccess,
    modalProps,
  };
}
