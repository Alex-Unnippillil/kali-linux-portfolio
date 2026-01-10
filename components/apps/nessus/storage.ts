export interface NessusJob {
  scanId: string;
  schedule: string;
}

export interface FalsePositive {
  findingId: string;
  reason: string;
}

const JOBS_KEY = 'nessusJobs';
const FALSE_POSITIVES_KEY = 'nessusFalsePositives';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const loadJobDefinitions = (): NessusJob[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<NessusJob[]>(window.localStorage.getItem(JOBS_KEY), []);
};

export const saveJobDefinition = (job: NessusJob): NessusJob[] => {
  if (typeof window === 'undefined') return [];
  const jobs = loadJobDefinitions();
  const next = [...jobs, job];
  window.localStorage.setItem(JOBS_KEY, JSON.stringify(next));
  return next;
};

export const loadFalsePositives = (): FalsePositive[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<FalsePositive[]>(window.localStorage.getItem(FALSE_POSITIVES_KEY), []);
};

export const recordFalsePositive = (findingId: string, reason: string): FalsePositive[] => {
  if (typeof window === 'undefined') return [];
  const fps = loadFalsePositives();
  const next = [...fps, { findingId, reason }];
  window.localStorage.setItem(FALSE_POSITIVES_KEY, JSON.stringify(next));
  return next;
};
