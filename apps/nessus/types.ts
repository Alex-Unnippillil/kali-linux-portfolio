export const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
export type Severity = (typeof severities)[number];

export interface Plugin {
  id: number;
  name: string;
  severity: Severity;
  cwe?: string[];
  cve?: string[];
  tags?: string[];
  category: string;
}

export interface Finding {
  plugin: number;
  severity: Severity;
}

export interface Scan {
  findings: Finding[];
}
