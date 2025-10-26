import JSZip from 'jszip';
import {
  BatchResult,
  createZipFromBatch,
  parseCsvRows,
  templateFilename,
} from '../../../apps/qr/components/BatchMode';

describe('BatchMode helpers', () => {
  it('parses CSV rows with headers and quoted values', () => {
    const csv = ['text,name,category', '"https://example.com","Example","Primary"', '"Hello, world","Greeting","Secondary"'].join('\n');
    const rows = parseCsvRows(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].text).toBe('https://example.com');
    expect(rows[0].columns.name).toBe('Example');
    expect(rows[1].text).toBe('Hello, world');
    expect(rows[1].columns.category).toBe('Secondary');
  });

  it('falls back to positional columns when no header is present', () => {
    const csv = ['first row,alpha', 'second row,beta'].join('\n');
    const rows = parseCsvRows(csv);

    expect(rows.map((row) => row.text)).toEqual(['first row', 'second row']);
    expect(rows[0].columns.column2).toBe('alpha');
  });

  it('creates a ZIP archive with PNG and SVG entries', async () => {
    const pngData = Buffer.from('png-data');
    const dataUrl = `data:image/png;base64,${pngData.toString('base64')}`;

    const batch: BatchResult[] = [
      {
        filename: templateFilename('{{row}}-{{column2}}', {
          columns: { column1: 'value', column2: 'alpha' },
          rowNumber: 1,
          text: 'value',
        }, 0),
        png: dataUrl,
        svg: '<svg>alpha</svg>',
        rowNumber: 1,
        columns: { column1: 'value', column2: 'alpha' },
      },
    ];

    const zip = createZipFromBatch(batch);
    expect(zip).toBeInstanceOf(JSZip);

    const files = Object.keys(zip.files);
    expect(files).toEqual(expect.arrayContaining(['1-alpha.png', '1-alpha.svg']));

    const pngBytes = await zip.file('1-alpha.png')?.async('uint8array');
    expect(pngBytes).toBeDefined();
    expect(Buffer.from(pngBytes as Uint8Array).toString()).toBe('png-data');

    const svg = await zip.file('1-alpha.svg')?.async('string');
    expect(svg).toBe('<svg>alpha</svg>');
  });
});
