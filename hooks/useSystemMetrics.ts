"use client";

import { useEffect, useState } from 'react';
import {
  getLatestSystemMetrics,
  subscribeSystemMetrics,
  SystemMetricsSample,
} from '../utils/systemMetrics';

const defaultSample: SystemMetricsSample = {
  cpu: 0,
  memory: 0,
  fps: 0,
  timestamp: 0,
};

export default function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetricsSample>(() => {
    if (typeof window === 'undefined') {
      return defaultSample;
    }
    return getLatestSystemMetrics();
  });

  useEffect(() => {
    const unsubscribe = subscribeSystemMetrics((sample) => {
      setMetrics(sample);
    });
    return unsubscribe;
  }, []);

  return metrics;
}

