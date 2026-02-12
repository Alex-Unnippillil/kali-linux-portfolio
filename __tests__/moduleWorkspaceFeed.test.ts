import {
  deserializeModuleWorkspaceSession,
  serializeModuleWorkspaceSession,
  buildModuleWorkspaceLink,
} from '../utils/moduleWorkspaceSession';
import {
  generateModuleWorkspaceAtomFeed,
  generateModuleWorkspaceRssFeed,
  getModuleWorkspaceFeedItems,
} from '../lib/feeds/moduleWorkspace';

describe('module workspace session serialization', () => {
  it('roundtrips a full session payload', () => {
    const session = {
      workspace: 'Recon Lab',
      moduleId: 'port-scan',
      options: { TARGET: 'demo.local' },
      result: '$ port-scan TARGET=demo.local\n[+] 192.168.0.1: Ports 22,80 open',
      store: { 'port-scan': 'cached result' },
      tags: ['network'],
    };
    const encoded = serializeModuleWorkspaceSession(session);
    const decoded = deserializeModuleWorkspaceSession(encoded);
    expect(decoded).toEqual(session);
  });

  it('returns null for invalid payloads', () => {
    expect(deserializeModuleWorkspaceSession('not-base64')).toBeNull();
    expect(deserializeModuleWorkspaceSession(undefined)).toBeNull();
    expect(deserializeModuleWorkspaceSession(['multi'])).toBeNull();
  });

  it('builds a URL with restore parameter', () => {
    const url = buildModuleWorkspaceLink('https://example.com/module-workspace', {
      workspace: 'Recon Lab',
      moduleId: 'port-scan',
    });
    expect(url).toContain('https://example.com/module-workspace');
    expect(url).toMatch(/restore=/);
  });
});

describe('module workspace feeds', () => {
  it('exposes feed items with deep links', () => {
    const items = getModuleWorkspaceFeedItems();
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.link).toContain('module-workspace');
      expect(item.link).toMatch(/restore=/);
    });
  });

  it('generates valid-looking Atom feed', () => {
    const atom = generateModuleWorkspaceAtomFeed();
    expect(atom).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(atom).toContain('<feed');
    expect(atom).toContain('application/atom+xml');
  });

  it('generates valid-looking RSS feed', () => {
    const rss = generateModuleWorkspaceRssFeed();
    expect(rss).toContain('<rss version="2.0">');
    expect(rss).toContain('<channel>');
    expect(rss).toContain('application/rss+xml');
  });
});
