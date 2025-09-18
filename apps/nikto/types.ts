export interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

export type NiktoSeverity = 'High' | 'Medium' | 'Low' | 'Info';
