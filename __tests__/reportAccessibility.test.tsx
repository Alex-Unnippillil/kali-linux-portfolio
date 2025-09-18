import axe from 'axe-core';
import { generateHtmlReport } from '../apps/autopsy/components/ReportExport';

describe('report accessibility export', () => {
  it('passes axe-core checks for headings and image labels', async () => {
    const html = generateHtmlReport('Demo Case', [
      {
        name: 'artifact.txt',
        type: 'Document',
        description: 'Example artifact for the exported report.',
        size: 128,
        plugin: 'metadata',
        timestamp: '2024-01-01T00:00:00Z',
        user: 'analyst',
        evidenceImage: {
          src: '/evidence.png',
          alt: 'Screenshot of artifact metadata',
        },
      },
    ]);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results = await axe.run(doc, {
      runOnly: {
        type: 'rule',
        values: ['page-has-heading-one', 'image-alt'],
      },
    });

    expect(results.violations).toHaveLength(0);
  });
});
