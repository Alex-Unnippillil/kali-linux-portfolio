import { promises as fs } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const reports = [];
const reportsDir = path.join(process.cwd(), 'public', 'openvas-reports');

async function ensureDir() {
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { target } = req.query;

  if (!target) {
    res.status(200).json({ reports });
    return;
  }

  // Simulate scan output
  const output = `OpenVAS scan for ${target}\nCompleted at ${new Date().toISOString()}`;
  await ensureDir();
  const id = Date.now();
  const pdfPath = path.join(reportsDir, `openvas-${id}.pdf`);

  try {
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = doc.pipe(fs.createWriteStream(pdfPath));
      doc.fontSize(20).text('OpenVAS Scan Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Target: ${target}`);
      doc.moveDown();
      doc.text(output);
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  const url = `/openvas-reports/openvas-${id}.pdf`;
  const report = { id, target, url, createdAt: new Date().toISOString() };
  reports.unshift(report);

  res.status(200).json({ output, report });
}

