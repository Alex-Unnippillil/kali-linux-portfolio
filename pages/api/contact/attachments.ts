import fs from 'fs/promises';
import formidable, { File } from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB total
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '25mb',
  },
};

const parseForm = (req: NextApiRequest) =>
  new Promise<File[]>((resolve, reject) => {
    const form = formidable({
      multiples: true,
      maxFileSize: MAX_ATTACHMENT_SIZE,
      allowEmptyFiles: false,
    });

    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      const incoming = files.files;
      if (!incoming) {
        resolve([]);
        return;
      }
      const list = Array.isArray(incoming) ? incoming : [incoming];
      resolve(list as File[]);
    });
  });

const cleanupFiles = async (uploads: File[]) => {
  await Promise.all(
    uploads.map(async (file) => {
      try {
        if (file.filepath) {
          await fs.unlink(file.filepath);
        }
      } catch {
        /* ignore */
      }
    })
  );
};

const attachmentHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  let uploads: File[] = [];
  try {
    uploads = await parseForm(req);
  } catch (err: any) {
    const code = err?.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'parse_error';
    res.status(400).json({ ok: false, code });
    return;
  }

  if (!uploads.length) {
    res.status(400).json({ ok: false, code: 'attachments_missing' });
    return;
  }

  const totalSize = uploads.reduce((sum, file) => sum + (file.size ?? 0), 0);
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
    await cleanupFiles(uploads);
    res.status(413).json({ ok: false, code: 'attachments_too_large' });
    return;
  }

  const rejected = uploads.find(
    (file) => file.mimetype && !ALLOWED_TYPES.has(file.mimetype)
  );
  if (rejected) {
    await cleanupFiles(uploads);
    res.status(415).json({ ok: false, code: 'unsupported_type' });
    return;
  }

  await cleanupFiles(uploads);

  res.status(200).json({
    ok: true,
    count: uploads.length,
    totalSize,
  });
};

export default attachmentHandler;
