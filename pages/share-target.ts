import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import type { IncomingMessage } from 'http';
import type { ParsedUrlQuery } from 'querystring';

const SHARE_KEYS = ['title', 'text', 'url'] as const;

type ShareTargetKey = (typeof SHARE_KEYS)[number];

export type ShareTargetValueMap = Partial<Record<ShareTargetKey, string[]>>;

function isFormUrlEncoded(contentType: string | string[] | undefined): boolean {
  if (!contentType) return false;
  if (Array.isArray(contentType)) {
    return contentType.some((value) =>
      value?.toLowerCase().includes('application/x-www-form-urlencoded'),
    );
  }
  return contentType.toLowerCase().includes('application/x-www-form-urlencoded');
}

export function toArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

export function extractShareValuesFromQuery(query: ParsedUrlQuery): ShareTargetValueMap {
  const result: ShareTargetValueMap = {};
  for (const key of SHARE_KEYS) {
    const rawValue = query[key as string];
    const values = toArray(rawValue as string | string[] | undefined)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length > 0) {
      result[key] = values;
    }
  }
  return result;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  if (req.readableEnded || req.complete) {
    return '';
  }

  return await new Promise<string>((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

export async function extractShareValuesFromBody(
  req: IncomingMessage,
): Promise<ShareTargetValueMap | undefined> {
  if (!isFormUrlEncoded(req.headers['content-type'])) {
    return undefined;
  }

  const rawBody = await readRequestBody(req);
  if (!rawBody) {
    return undefined;
  }

  const params = new URLSearchParams(rawBody);
  const result: ShareTargetValueMap = {};

  for (const key of SHARE_KEYS) {
    const values = params
      .getAll(key)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length > 0) {
      result[key] = values;
    }
  }

  return result;
}

export function mergeShareSources(
  ...sources: Array<ShareTargetValueMap | undefined>
): ShareTargetValueMap {
  const result: ShareTargetValueMap = {};

  for (const key of SHARE_KEYS) {
    const collected: string[] = [];
    for (const source of sources) {
      if (!source?.[key]) continue;
      for (const value of source[key] as string[]) {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          collected.push(trimmed);
        }
      }
    }
    if (collected.length > 0) {
      result[key] = collected;
    }
  }

  return result;
}

export function createNoteContent(values: ShareTargetValueMap): string {
  const parts: string[] = [];

  for (const key of SHARE_KEYS) {
    const entries = values[key];
    if (!entries) continue;
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        parts.push(trimmed);
      }
    }
  }

  return parts.join('\n\n');
}

export function buildRedirectDestination(
  noteContent: string,
  basePath = '/apps/sticky_notes',
  source = 'share-target',
): string {
  const params = new URLSearchParams();
  if (noteContent.length > 0) {
    params.set('text', noteContent);
  }
  if (source) {
    params.set('source', source);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  let bodyValues: ShareTargetValueMap | undefined;

  if (context.req.method === 'POST') {
    try {
      bodyValues = await extractShareValuesFromBody(context.req);
    } catch (error) {
      console.error('Failed to parse shared data', error);
    }
  }

  const queryValues = extractShareValuesFromQuery(context.query);
  const merged = mergeShareSources(queryValues, bodyValues);
  const noteContent = createNoteContent(merged);

  return {
    redirect: {
      destination: buildRedirectDestination(noteContent),
      permanent: false,
    },
  };
};

export default function ShareTargetPage() {
  return null;
}

