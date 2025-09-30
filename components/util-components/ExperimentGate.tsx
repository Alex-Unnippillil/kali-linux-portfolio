import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useExperiments } from '../../hooks/useExperiments';
import { createLogger } from '../../lib/logger';

interface ExperimentGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
  metadata?: Record<string, unknown>;
  onExposure?: (flag: string) => void;
}

const ExperimentGate = ({
  flag,
  children,
  fallback = null,
  metadata = {},
  onExposure,
}: ExperimentGateProps) => {
  const { getFlag, ready } = useExperiments();
  const enabled = getFlag(flag) ?? false;
  const logger = useMemo(() => createLogger(), []);
  const loggedRef = useRef(false);
  const flagRef = useRef(flag);

  useEffect(() => {
    if (flagRef.current !== flag) {
      flagRef.current = flag;
      loggedRef.current = false;
    }
  }, [flag]);

  useEffect(() => {
    if (!ready || !enabled || loggedRef.current) return;
    loggedRef.current = true;
    logger.info('experiment_exposure', { flag, ...metadata });
    if (onExposure) {
      onExposure(flag);
    }
  }, [enabled, flag, logger, metadata, onExposure, ready]);

  if (!ready) {
    return null;
  }

  return <>{enabled ? children : fallback}</>;
};

export type { ExperimentGateProps };
export { ExperimentGate };
export default ExperimentGate;
