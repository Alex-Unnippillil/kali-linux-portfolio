export interface CveProduct {
  vendor: string;
  product: string;
  versions?: string[];
}

export interface CveItem {
  cve: string;
  title: string;
  cvss: number;
  epss?: number;
  published: string;
  updated?: string;
  summary: string;
  affected: CveProduct[];
  tags?: string[];
  references: string[];
  detection?: string[];
  mitigation?: string;
}

export interface ExploitedCve extends CveItem {
  firstSeen: string;
  observedIn?: string[];
  mitigation: string;
}

export interface VendorStat {
  vendor: string;
  count: number;
}

export interface WeeklyActivity {
  week: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CveSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  exploited: number;
}

export interface CveFeed {
  generated: string;
  summary: CveSummary;
  trending: CveItem[];
  exploited: ExploitedCve[];
  vendorBreakdown: VendorStat[];
  weeklyActivity: WeeklyActivity[];
  metadata: {
    source: string;
    disclaimer: string;
  };
}
