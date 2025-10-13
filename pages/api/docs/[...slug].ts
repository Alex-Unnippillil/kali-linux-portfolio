import type { NextApiRequest, NextApiResponse } from 'next';

import { loadDocWithFallback, renderDocContent } from '../../../lib/docs/content';
import { normalizeDocSlug } from '../../../lib/docs/slug';
import { DOCS_LATEST_VERSION_ID, getDocsVersionLabel } from '../../../lib/docs/versions';

interface DocResponse {
  slug: string;
  title: string;
  html: string;
  versionId: string;
  versionLabel: string;
  fallbackVersionId: string | null;
  fallbackVersionLabel: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = normalizeDocSlug(req.query.slug as string[] | string | undefined);
  if (!slug) {
    return res.status(400).json({ error: 'Missing documentation slug' });
  }

  const versionParam = Array.isArray(req.query.version) ? req.query.version[0] : req.query.version;
  const requestedVersionId = versionParam && versionParam !== 'latest' ? versionParam : DOCS_LATEST_VERSION_ID;

  try {
    const loaded = await loadDocWithFallback(requestedVersionId, slug);
    if (!loaded) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const html = renderDocContent(loaded.record);

    const response: DocResponse = {
      slug: loaded.record.slug,
      title: loaded.record.title,
      html,
      versionId: loaded.resolvedVersionId,
      versionLabel: getDocsVersionLabel(loaded.resolvedVersionId),
      fallbackVersionId: loaded.fallbackVersionId ?? null,
      fallbackVersionLabel: loaded.fallbackVersionId ? getDocsVersionLabel(loaded.fallbackVersionId) : null,
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(response);
  } catch (error) {
    console.error('docs api error', error);
    return res.status(500).json({ error: 'Failed to load document' });
  }
}
