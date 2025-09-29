import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import categoryMap from '../applications/menu/category-map.json';
import synonyms from '../applications/menu/synonyms.json';

describe('menu category mapping', () => {
  it('captures every desktop entry with keyword support', () => {
    const desktopDir = join(process.cwd(), 'applications', 'menu', 'desktop-files');
    const desktopCount = readdirSync(desktopDir).filter((file) => file.endsWith('.desktop')).length;

    expect(categoryMap.desktopFiles).toBe(desktopCount);
    expect(categoryMap.apps).toHaveLength(desktopCount);
    expect(categoryMap.missingCategories).toHaveLength(0);

    const keywordCoverage: Array<{ id: string; missing: string[] }> = [];
    for (const app of categoryMap.apps) {
      expect(app.keywords.length).toBeGreaterThan(0);
      const expected = (synonyms as Record<string, string[]>)[app.id] || [];
      const lowerKeywords = app.keywords.map((kw: string) => kw.toLowerCase());
      const missing = expected.filter((token) => {
        const value = token.toLowerCase();
        return !lowerKeywords.some((kw) => kw.includes(value) || value.includes(kw));
      });
      if (missing.length > 0) {
        keywordCoverage.push({ id: app.id, missing });
      }
    }

    expect(keywordCoverage).toHaveLength(0);
  });

  it('provides summaries for each top-level category', () => {
    const categoryIds = categoryMap.categories.map((category: { id: string }) => category.id);
    const expectedTopLevel = [
      'kali-usual-applications',
      'kali-reconnaissance',
      'kali-initial-access',
      'kali-execution',
      'kali-privilege-escalation',
      'kali-credential-access',
      'kali-discovery',
      'kali-collection',
      'kali-command-and-control',
      'kali-exfiltration',
      'kali-forensics',
    ];

    expectedTopLevel.forEach((id) => {
      expect(categoryIds).toContain(id);
    });
  });
});

