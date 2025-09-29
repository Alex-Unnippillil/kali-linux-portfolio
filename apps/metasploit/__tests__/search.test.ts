import type { Module } from '../types';
import { buildSearchIndex, computeFacets, filterModules } from '../search';

const modules: Module[] = [
  {
    name: 'auxiliary/scanner/ftp/login',
    description: 'FTP login scanner for Linux targets',
    type: 'auxiliary',
    severity: 'medium',
    platform: 'linux',
    tags: ['ftp', 'scanner'],
  },
  {
    name: 'exploit/windows/smb/ms17_010',
    description: 'MS17-010 EternalBlue exploit',
    type: 'exploit',
    severity: 'critical',
    platform: 'windows',
    tags: ['smb', 'windows'],
  },
  {
    name: 'post/multi/gather/ssh_creds',
    description: 'Harvests SSH credentials',
    type: 'post',
    severity: 'low',
    platform: 'multi',
    tags: ['ssh', 'creds'],
  },
];

describe('metasploit search utilities', () => {
  it('computes facet options from module metadata', () => {
    const facets = computeFacets(modules);
    expect(facets.types).toEqual(['auxiliary', 'exploit', 'post']);
    expect(facets.platforms).toEqual(['linux', 'multi', 'windows']);
    expect(facets.tags).toContain('ftp');
    expect(facets.tags).toContain('smb');
  });

  it('filters modules using query and facet combinations', () => {
    const index = buildSearchIndex(modules);
    const filtered = filterModules(index, {
      query: 'smb',
      type: 'exploit',
      platform: 'windows',
      tag: 'smb',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('exploit/windows/smb/ms17_010');
  });

  it('returns modules when query matches description despite different casing', () => {
    const index = buildSearchIndex(modules);
    const filtered = filterModules(index, {
      query: 'SSH CREDENTIALS',
      type: 'post',
      platform: 'multi',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('post/multi/gather/ssh_creds');
  });
});
