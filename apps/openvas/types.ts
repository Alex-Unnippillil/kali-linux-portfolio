export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Vulnerability {
  id: string;
  name: string;
  cvss: number;
  epss: number;
  description: string;
  remediation: string;
  detectedAt: string;
}

export interface HostReport {
  host: string;
  risk: Severity;
  vulns: Vulnerability[];
}

export interface Finding extends Vulnerability {
  host: string;
  severity: Severity;
}

export interface SeverityTimelineEntry {
  date: string;
  counts: Record<Severity, number>;
  total: number;
}
