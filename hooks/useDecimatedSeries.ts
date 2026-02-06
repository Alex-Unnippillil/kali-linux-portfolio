import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChartPointInput, DecimatorStrategy } from '../types/chart-decimator';
import { normalizePoints } from '../utils/charting/decimator';
import { useChartDecimator } from './useChartDecimator';

interface UseDecimatedSeriesOptions {
  maxPoints: number;
  highWatermark?: number;
  strategy?: DecimatorStrategy;
}

export function useDecimatedSeries(
  points: ReadonlyArray<ChartPointInput>,
  { maxPoints, highWatermark, strategy = 'lttb' }: UseDecimatedSeriesOptions
) {
  const normalized = useMemo(() => normalizePoints(points), [points]);
  const { decimate, fallbackDecimate } = useChartDecimator();
  const [display, setDisplay] = useState(() => normalized.slice(-maxPoints));
  const requestIdRef = useRef(0);

  useEffect(() => {
    const watermark = highWatermark ?? Math.max(maxPoints, Math.floor(maxPoints * 1.5));

    if (normalized.length === 0) {
      setDisplay([]);
      return;
    }

    if (normalized.length <= maxPoints) {
      setDisplay(normalized);
      return;
    }

    if (normalized.length <= watermark) {
      setDisplay(normalized.slice(-maxPoints));
      return;
    }

    let cancelled = false;
    const currentId = requestIdRef.current + 1;
    requestIdRef.current = currentId;

    decimate(normalized, { threshold: maxPoints, strategy })
      .then((result) => {
        if (!cancelled && requestIdRef.current === currentId) {
          setDisplay(result);
        }
      })
      .catch(() => {
        if (!cancelled && requestIdRef.current === currentId) {
          setDisplay(fallbackDecimate(normalized, { threshold: maxPoints, strategy }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [decimate, fallbackDecimate, highWatermark, maxPoints, normalized, strategy]);

  return display;
}
