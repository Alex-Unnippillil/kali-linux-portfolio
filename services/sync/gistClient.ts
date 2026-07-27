import { createTwoFilesPatch } from 'diff';

export interface GistFile {
  filename: string;
  content: string;
}

export interface GistSnapshot {
  files: Record<string, GistFile>;
}

export interface FetchGistSnapshotOptions {
  gistId: string;
  token: string;
}

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_HEADERS = {
  Accept: 'application/vnd.github+json',
};

async function parseError(response: Response): Promise<string> {
  try {
    const clone = 'clone' in response ? response.clone() : response;
    const data = await clone.json();
    if (data && typeof (data as { message?: unknown }).message === 'string') {
      return (data as { message: string }).message;
    }
  } catch (err) {
    // Ignore JSON parse errors; fall back to status text
  }
  try {
    const text = await response.text();
    if (text) return text;
  } catch (err) {
    // Ignore text parse errors
  }
  return response.statusText || 'Unknown error';
}

export async function fetchGistSnapshot({
  gistId,
  token,
}: FetchGistSnapshotOptions): Promise<GistSnapshot> {
  const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(`Failed to load gist: ${message}`);
  }

  const data = await response.json();
  const files: Record<string, GistFile> = {};
  if (data && typeof data === 'object') {
    const rawFiles = (data as {
      files?: Record<string, { filename?: string; content?: string | null } | null>;
    }).files;
    if (rawFiles) {
      Object.entries(rawFiles).forEach(([key, value]) => {
        if (value && typeof value.content === 'string') {
          files[key] = {
            filename: value.filename ?? key,
            content: value.content,
          };
        }
      });
    }
  }

  return { files };
}

export interface UpdateGistSnapshotOptions {
  gistId: string;
  token: string;
  files: Record<string, { content: string } | null>;
  description?: string;
}

export async function updateGistSnapshot({
  gistId,
  token,
  files,
  description,
}: UpdateGistSnapshotOptions): Promise<void> {
  const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      files,
      description,
    }),
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(`Failed to update gist: ${message}`);
  }
}

export interface DiffPreviewInput {
  filename: string;
  localContent: string;
  remoteContent: string;
}

export function buildDiffPreview({
  filename,
  localContent,
  remoteContent,
}: DiffPreviewInput): string {
  if (localContent === remoteContent) {
    return '';
  }

  return createTwoFilesPatch(
    `${filename} (local)`,
    `${filename} (remote)`,
    localContent,
    remoteContent,
    '',
    '',
  );
}
