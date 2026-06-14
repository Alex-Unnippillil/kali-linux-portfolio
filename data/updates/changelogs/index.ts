import core from './core.json';
import tooling from './tooling.json';
import services from './services.json';

export type ChangeCategory = 'security' | 'feature' | 'bugfix';

export interface ChangelogPackage {
  id: string;
  name: string;
  version?: string;
  category?: ChangeCategory | string;
  summary?: string;
  size?: string;
  etaMinutes?: number;
  requiresRestart?: boolean;
  restartType?: string;
  cves?: string[];
}

export interface ChangelogRelease {
  id: string;
  release?: string;
  releasedAt?: string;
  packages?: ChangelogPackage[];
}

const fixtures: ChangelogRelease[] = [
  core as ChangelogRelease,
  tooling as ChangelogRelease,
  services as ChangelogRelease,
];

export async function getChangelogReleases(): Promise<ChangelogRelease[]> {
  return fixtures;
}

export default fixtures;
