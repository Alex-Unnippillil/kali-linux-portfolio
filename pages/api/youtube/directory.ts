import type { NextApiRequest, NextApiResponse } from 'next';

import {
  fetchYouTubeChannelSummary,
  fetchYouTubePlaylistDirectoryByChannelId,
  parseYouTubeChannelId,
  type YouTubePlaylistDirectory,
} from '../../../utils/youtube';

type DirectoryResponse =
  | {
      summary: Awaited<ReturnType<typeof fetchYouTubeChannelSummary>>;
      directory: YouTubePlaylistDirectory;
    }
  | { error: string };

function resolveApiKey() {
  return (process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '').trim();
}

function resolveChannelId(raw?: string | string[] | null) {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseYouTubeChannelId(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DirectoryResponse>,
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

  const envChannelId = parseYouTubeChannelId(process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? '');
  const requestedChannelId = resolveChannelId(req.query.channelId);
  const channelId = requestedChannelId ?? envChannelId;

  if (!channelId) {
    return res.status(400).json({
      error:
        'Missing or invalid channel id. Provide a channelId query param or set NEXT_PUBLIC_YOUTUBE_CHANNEL_ID.',
    });
  }

  try {
    const controller = new AbortController();
    const [summary, directory] = await Promise.all([
      fetchYouTubeChannelSummary(channelId, apiKey, controller.signal),
      fetchYouTubePlaylistDirectoryByChannelId(channelId, apiKey, controller.signal),
    ]);

    return res.status(200).json({
      summary,
      directory,
    });
  } catch (error) {
    const message =
      (error as Error)?.message || 'Unable to load playlists from the YouTube Data API.';
    const status =
      (message || '').toLowerCase().includes('quota') || (message || '').toLowerCase().includes('forbidden')
        ? 429
        : 502;
    return res.status(status).json({ error: message });
  }
}
