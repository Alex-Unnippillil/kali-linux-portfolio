import sessions from '../../data/module-workspace-sessions.json';
import {
  ModuleWorkspaceSession,
  buildModuleWorkspaceLink,
} from '../../utils/moduleWorkspaceSession';

type SessionEntry = {
  id: string;
  title: string;
  summary: string;
  workspace: string;
  moduleId: string;
  options?: Record<string, string>;
  result?: string;
  updated: string;
  tags?: string[];
};

type FeedItem = SessionEntry & {
  link: string;
  isoUpdated: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://unnippillil.com';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const renderContentHtml = (item: SessionEntry): string => {
  const segments: string[] = [];
  segments.push(`<p>${escapeXml(item.summary)}</p>`);
  segments.push(`<p><strong>Workspace:</strong> ${escapeXml(item.workspace)}</p>`);
  if (item.options && Object.keys(item.options).length) {
    const entries = Object.entries(item.options)
      .map(([key, value]) => `<li><code>${escapeXml(key)}</code>: ${escapeXml(value)}</li>`)
      .join('');
    segments.push(`<p><strong>Options</strong></p><ul>${entries}</ul>`);
  }
  if (item.result) {
    segments.push(`<p><strong>Result</strong></p><pre>${escapeXml(item.result)}</pre>`);
  }
  return segments.join('');
};

const sortSessions = (list: SessionEntry[]): SessionEntry[] =>
  [...list].sort((a, b) =>
    new Date(b.updated).getTime() - new Date(a.updated).getTime(),
  );

const toFeedItems = (list: SessionEntry[]): FeedItem[] => {
  const basePageUrl = `${SITE_URL}/module-workspace`;
  return sortSessions(list).map(entry => {
    const session: ModuleWorkspaceSession = {
      workspace: entry.workspace,
      moduleId: entry.moduleId,
      options: entry.options,
      result: entry.result,
      tags: entry.tags,
    };
    const link = buildModuleWorkspaceLink(basePageUrl, session);
    return {
      ...entry,
      link,
      isoUpdated: new Date(entry.updated).toISOString(),
    };
  });
};

const feedItems = toFeedItems(sessions as SessionEntry[]);

const lastUpdated = feedItems[0]?.isoUpdated ?? new Date().toISOString();

export const generateModuleWorkspaceAtomFeed = (): string => {
  const selfUrl = `${SITE_URL}/feeds/module-workspace.atom.xml`;
  const altUrl = `${SITE_URL}/module-workspace`;
  const entries = feedItems
    .map(item => {
      const categories = (item.tags ?? [])
        .map(tag => `<category term="${escapeXml(tag)}" />`)
        .join('');
      return `
    <entry>
      <id>tag:unnippillil.com,2024:module-workspace/${escapeXml(item.id)}</id>
      <title>${escapeXml(item.title)}</title>
      <updated>${item.isoUpdated}</updated>
      <link href="${escapeXml(item.link)}" />
      <summary type="html">${renderContentHtml(item)}</summary>
      <content type="html">${renderContentHtml(item)}</content>
      ${categories}
    </entry>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:unnippillil.com,2024:module-workspace-feed</id>
  <title>Module Workspace Sessions</title>
  <updated>${lastUpdated}</updated>
  <link rel="self" type="application/atom+xml" href="${escapeXml(selfUrl)}" />
  <link rel="alternate" type="text/html" href="${escapeXml(altUrl)}" />
  <author><name>Alex Unnippillil</name></author>
  ${entries}
</feed>`;
};

const formatRfc822 = (iso: string): string => new Date(iso).toUTCString();

export const generateModuleWorkspaceRssFeed = (): string => {
  const selfUrl = `${SITE_URL}/feeds/module-workspace.rss.xml`;
  const channelLink = `${SITE_URL}/module-workspace`;
  const items = feedItems
    .map(item => {
      const categories = (item.tags ?? [])
        .map(tag => `<category>${escapeXml(tag)}</category>`)
        .join('');
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">module-workspace:${escapeXml(item.id)}</guid>
      <pubDate>${formatRfc822(item.isoUpdated)}</pubDate>
      <description>${renderContentHtml(item)}</description>
      ${categories}
    </item>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Module Workspace Sessions</title>
    <link>${escapeXml(channelLink)}</link>
    <description>Curated module workspace presets with deep links that restore simulated lab state.</description>
    <language>en</language>
    <lastBuildDate>${formatRfc822(lastUpdated)}</lastBuildDate>
    <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
};

export const getModuleWorkspaceFeedItems = (): FeedItem[] => [...feedItems];
