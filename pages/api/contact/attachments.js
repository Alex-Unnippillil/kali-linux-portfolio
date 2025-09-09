import formidable from 'formidable';

export const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const form = formidable({ multiples: true });
  let files;
  try {
    files = await new Promise((resolve, reject) => {
      form.parse(req, (err, _fields, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  } catch {
    res.status(400).json({ ok: false });
    return;
  }
  const list = files?.files
    ? Array.isArray(files.files)
      ? files.files
      : [files.files]
    : [];
  const total = list.reduce((sum, f) => sum + (f?.size || 0), 0);
  if (total > MAX_TOTAL_ATTACHMENT_SIZE) {
    res.status(413).json({ ok: false, code: 'too_large' });
    return;
  }
  res.status(200).json({ ok: true });
}
