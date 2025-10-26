import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { createReportBundle, DEFAULT_REPORT_TEMPLATE, type ReportFontSet } from '../../../modules/reporting/pipeline';

type ExportBody = {
  markdown?: string;
  template?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

type ExportResponse =
  | { html: string; pdfBase64: string }
  | { error: string };

let cachedFonts: Promise<ReportFontSet> | null = null;

async function loadFonts(): Promise<ReportFontSet> {
  if (!cachedFonts) {
    cachedFonts = (async () => {
      const root = process.cwd();
      const fontDir = path.join(root, 'public', 'fonts');
      const [regular, bold, italic, mono] = await Promise.all([
        fs.readFile(path.join(fontDir, 'Inter-Regular.ttf')),
        fs.readFile(path.join(fontDir, 'Inter-Bold.ttf')),
        fs.readFile(path.join(fontDir, 'Inter-Italic.ttf')),
        fs.readFile(path.join(fontDir, 'FiraCode-Regular.ttf')),
      ]);
      return {
        regular: new Uint8Array(regular),
        bold: new Uint8Array(bold),
        italic: new Uint8Array(italic),
        mono: new Uint8Array(mono),
      } satisfies ReportFontSet;
    })();
  }
  return cachedFonts;
}

function parseBody(req: NextApiRequest): ExportBody {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as ExportBody;
    } catch {
      return {};
    }
  }
  return req.body as ExportBody;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ExportResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = parseBody(req);
  if (typeof body.markdown !== 'string' || !body.markdown.trim()) {
    res.status(400).json({ error: 'markdown is required' });
    return;
  }

  try {
    const fonts = await loadFonts();
    const template = typeof body.template === 'string' ? body.template : DEFAULT_REPORT_TEMPLATE;
    const bundle = await createReportBundle(
      {
        markdown: body.markdown,
        template,
        metadata: body.metadata,
      },
      fonts,
    );

    res.status(200).json({
      html: bundle.html,
      pdfBase64: Buffer.from(bundle.pdf).toString('base64'),
    });
  } catch (error) {
    console.error('Failed to export report', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}
