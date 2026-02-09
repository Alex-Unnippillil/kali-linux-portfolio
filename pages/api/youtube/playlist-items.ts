import type { NextApiRequest, NextApiResponse } from 'next';

import { fetchYouTubePlaylistItems } from '../../../utils/youtube';

type PlaylistItemsResponse =
  | Awaited<ReturnType<typeof fetchYouTubePlaylistItems>>
  | { error: string };

function resolveApiKey() {
  return (process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '').trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlaylistItemsResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: 'YouTube API key not configured. Set YOUTUBE_API_KEY on the server to enable this API.',
    });
  }

  const playlistId = (req.query.playlistId as string | undefined)?.trim();
  if (!playlistId) {
    return res.status(400).json({ error: 'playlistId is required' });
  }

  const pageToken = (req.query.pageToken as string | undefined)?.trim() || undefined;
  const maxResults = Number(req.query.maxResults ?? 50);

  try {
    const controller = new AbortController();
    const items = await fetchYouTubePlaylistItems(playlistId, apiKey, {
      pageToken,
      maxResults,
      signal: controller.signal,
    });
    return res.status(200).json(items);
  } catch (error) {
    const message =
      (error as Error)?.message || 'Unable to load playlist items from the YouTube Data API.';
    const status =
      (message || '').toLowerCase().includes('quota') || (message || '').toLowerCase().includes('forbidden')
        ? 429
        : 502;
    return res.status(status).json({ error: message });
  }
}
