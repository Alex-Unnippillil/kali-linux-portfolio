import { filterAndRankSections, normalizeItems, SECTION_METADATA } from '../../../utils/commandPalette/indexing';
import type { SectionSource } from '../../../utils/commandPalette/indexing';

describe('command palette indexing', () => {
  const buildSection = (
    items: Array<{ id: string; title: string; subtitle?: string; keywords?: string[]; href?: string }>,
    type: SectionSource['type'],
  ): SectionSource => ({
    type,
    items: normalizeItems(items, type),
  });

  it('orders sections according to priority when query is empty', () => {
    const sources: SectionSource[] = [
      buildSection([
        { id: 'settings', title: 'Settings' },
      ], 'action'),
      buildSection([
        { id: 'docs/task', title: 'Tasks Doc', subtitle: 'Tasks overview', href: '/docs/tasks.md' },
      ], 'doc'),
      buildSection([
        { id: 'terminal', title: 'Terminal' },
      ], 'app'),
      buildSection([
        { id: 'index', title: 'Home', href: '/' },
      ], 'route'),
      buildSection([
        { id: 'window-1', title: 'Terminal Window' },
      ], 'window'),
    ];

    const sections = filterAndRankSections(sources, '');
    const order = sections.map((section) => section.type);

    expect(order).toEqual(['window', 'app', 'doc', 'route', 'action']);
    sections.forEach((section) => {
      expect(section.label).toBe(SECTION_METADATA[section.type].label);
    });
  });

  it('ranks exact matches above partial matches', () => {
    const sources: SectionSource[] = [
      buildSection([
        { id: 'weather', title: 'Weather Widget', keywords: ['forecast'] },
        { id: 'wifi', title: 'WiFi Scanner', keywords: ['network'] },
      ], 'app'),
      buildSection([
        { id: 'docs/weather', title: 'Weather Widget Guide', subtitle: 'Widget configuration', href: '/docs/weather-widget.md' },
      ], 'doc'),
    ];

    const sections = filterAndRankSections(sources, 'weather');
    const appSection = sections.find((section) => section.type === 'app');
    const docSection = sections.find((section) => section.type === 'doc');
    expect(appSection?.items[0].id).toBe('weather');
    expect(docSection?.items[0].id).toBe('docs/weather');
  });

  it('boosts recently selected entries when no query provided', () => {
    const sources: SectionSource[] = [
      buildSection([
        { id: 'nmap', title: 'Nmap' },
        { id: 'terminal', title: 'Terminal' },
      ], 'app'),
    ];

    const recents = [
      { id: 'terminal', type: 'app', title: 'Terminal', lastUsed: Date.now() },
    ];

    const sections = filterAndRankSections(sources, '', recents as any);
    expect(sections[0].items[0].id).toBe('terminal');
  });
});
