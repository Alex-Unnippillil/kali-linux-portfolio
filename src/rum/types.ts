export type RumMetricName = 'INP' | 'FID';

export type RumRating = 'good' | 'needs-improvement' | 'poor';

export interface RumAttribution {
  eventType?: string;
  target?: string;
  interactionId?: number;
}

export interface RumSample {
  id: string;
  name: RumMetricName;
  value: number;
  rating: RumRating;
  timestamp: number;
  attribution?: RumAttribution;
}

export interface RumState {
  history: Record<RumMetricName, RumSample[]>;
}
