import modulesJson from '../../components/apps/metasploit/modules.json';

export interface RawModule {
  name: string;
  description: string;
  type: string;
  severity: string;
  platform?: string;
  tags?: string[];
  rank?: string;
  [key: string]: any;
}

export interface NormalizedModule extends RawModule {
  rank: string;
  platformLower: string;
  lowerName: string;
  lowerDescription: string;
  tagCache: string[];
}

const severityToRank: Record<string, string> = {
  critical: 'excellent',
  high: 'great',
  medium: 'good',
  low: 'normal',
  info: 'manual',
};

const normalizedModules: NormalizedModule[] = (modulesJson as RawModule[]).map((module) => {
  const severity = (module.severity || '').toLowerCase();
  const providedRank = (module.rank || '').toString().toLowerCase();
  const rank = providedRank || severityToRank[severity] || 'normal';
  const platform = module.platform || '';
  const lowerName = module.name.toLowerCase();
  const lowerDescription = (module.description || '').toLowerCase();
  const tagCache = (module.tags || []).map((tag) => tag.toLowerCase());

  return {
    ...module,
    rank,
    platformLower: platform.toLowerCase(),
    lowerName,
    lowerDescription,
    tagCache,
  };
});

export default normalizedModules;
