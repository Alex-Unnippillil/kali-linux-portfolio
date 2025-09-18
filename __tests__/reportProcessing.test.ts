import type { FigureNumberingScheme } from '../components/apps/reconng/components/reportProcessing';
import {
  preprocessMarkdown,
  renderTemplate,
  stripMarkdown,
} from '../components/apps/reconng/components/reportProcessing';

const sampleFindings = [
  {
    title: 'Test Finding',
    description: 'Finding description',
    severity: 'Medium',
  },
];

describe('renderTemplate', () => {
  it('respects optional section toggles', () => {
    const template = 'Intro\n{{#section appendix}}Appendix content{{/section}}';
    const withAppendix = renderTemplate(template, sampleFindings, {
      appendix: true,
    });
    expect(withAppendix).toContain('Appendix content');

    const withoutAppendix = renderTemplate(template, sampleFindings, {
      appendix: false,
    });
    expect(withoutAppendix).not.toContain('Appendix content');
  });

  it('renders findings tokens', () => {
    const template = '{{#findings}}- {{index}}: {{title}} ({{severity}}){{/findings}}';
    const rendered = renderTemplate(template, sampleFindings, {});
    expect(rendered).toContain('1: Test Finding (Medium)');
  });
});

describe('preprocessMarkdown', () => {
  it('numbers figure references and adds captions', () => {
    const base = '# Section\n![Figure: Demo](image.png)';
    const result = preprocessMarkdown(base, { includeTableOfContents: true }, 'roman');
    expect(result.markdown).toContain('![Figure I]');
    expect(result.markdown).toContain('_Figure I: Demo_');
    expect(result.markdown).toContain('Table of Contents');
    expect(result.markdown).toContain('- [Section](#section)');
  });

  it('uses configured numbering scheme', () => {
    const base = '# Title\n![Figure: Caption](x.png)';
    const scheme: FigureNumberingScheme = 'alphabetic';
    const result = preprocessMarkdown(base, { includeTableOfContents: false }, scheme);
    expect(result.markdown).toContain('![Figure A]');
  });
});

describe('stripMarkdown', () => {
  it('removes emphasis and links', () => {
    expect(stripMarkdown('**Bold** _Italic_ [link](https://example.com)')).toBe(
      'Bold Italic link',
    );
  });
});
