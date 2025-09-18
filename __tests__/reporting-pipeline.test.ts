import path from 'path';
import { promises as fs } from 'fs';
import { createReportBundle, DEFAULT_REPORT_TEMPLATE, type ReportFontSet } from '../modules/reporting/pipeline';

describe('reporting pipeline', () => {
  let fonts: ReportFontSet;

  beforeAll(async () => {
    const fontDir = path.join(process.cwd(), 'public', 'fonts');
    const [regular, bold, italic, mono] = await Promise.all([
      fs.readFile(path.join(fontDir, 'Inter-Regular.ttf')),
      fs.readFile(path.join(fontDir, 'Inter-Bold.ttf')),
      fs.readFile(path.join(fontDir, 'Inter-Italic.ttf')),
      fs.readFile(path.join(fontDir, 'FiraCode-Regular.ttf')),
    ]);
    fonts = {
      regular: new Uint8Array(regular),
      bold: new Uint8Array(bold),
      italic: new Uint8Array(italic),
      mono: new Uint8Array(mono),
    };
  });

  it('converts markdown into html and pdf output', async () => {
    const result = await createReportBundle(
      {
        markdown: '# Demo Report\n\nThis is **bold** text with a list:\n\n- First item\n- Second item\n\n```bash\nls -al\n```',
        template: DEFAULT_REPORT_TEMPLATE,
        metadata: { title: 'Demo Report', client: 'Unit Test' },
      },
      fonts,
    );

    expect(result.html).toContain('<h1>Demo Report</h1>');
    expect(result.html).toContain('<strong>bold</strong>');
    expect(result.pdf.length).toBeGreaterThan(1000);
  });
});
