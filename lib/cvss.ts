import { calculateBaseResult, calculateBaseScore } from 'cvss4';

export interface CvssInfo {
  score: number;
  impact: number | null;
  exploitability: number | null;
}

export function parseCvss(vector?: string): CvssInfo | null {
  if (!vector) return null;
  try {
    const score = calculateBaseScore(vector);
    if (vector.startsWith('CVSS:3.1') || vector.startsWith('CVSS:3.0')) {
      const res = calculateBaseResult(vector);
      return { score, impact: res.impact, exploitability: res.exploitability };
    }
    return { score, impact: null, exploitability: null };
  } catch {
    return null;
  }
}
