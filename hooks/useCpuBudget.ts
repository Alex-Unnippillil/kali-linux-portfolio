import { useEffect, useState } from 'react';

interface CpuBudgetOptions {
  minCores?: number;
  minMemoryGb?: number;
}

const DEFAULT_MIN_CORES = 4;
const DEFAULT_MIN_MEMORY = 4;

export default function useCpuBudget(options: CpuBudgetOptions = {}) {
  const { minCores = DEFAULT_MIN_CORES, minMemoryGb = DEFAULT_MIN_MEMORY } = options;
  const [hasBudget, setHasBudget] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const cores = navigator.hardwareConcurrency ?? minCores;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? minMemoryGb;
    if (cores < minCores || memory < minMemoryGb) {
      setHasBudget(false);
    }
  }, [minCores, minMemoryGb]);

  return hasBudget;
}
