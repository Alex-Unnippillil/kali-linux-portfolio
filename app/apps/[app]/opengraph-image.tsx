import { ImageResponse } from 'next/server';

type AppConfigEntry = {
  id: string;
  title?: string;
};

type ImageParams = {
  params: {
    app?: string;
  };
};

const FALLBACK_TITLE = 'Kali Linux Portfolio';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

let appsModulePromise: Promise<{ default: AppConfigEntry[] }> | null = null;

const loadAppTitle = async (slug: string): Promise<string | undefined> => {
  if (!slug) {
    return undefined;
  }

  try {
    if (!appsModulePromise) {
      appsModulePromise = import('../../../apps.config');
    }

    const mod = await appsModulePromise;
    const apps = Array.isArray(mod?.default) ? mod.default : [];
    const entry = apps.find((appConfig) => appConfig?.id === slug);

    return entry?.title;
  } catch {
    return undefined;
  }
};

const formatSlug = (slug: string): string => {
  if (!slug) {
    return FALLBACK_TITLE;
  }

  const parts = slug
    .replace(/%20/g, ' ')
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean);

  if (parts.length === 0) {
    return FALLBACK_TITLE;
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default async function Image({ params }: ImageParams) {
  const slug = decodeURIComponent(params?.app ?? '');
  const titleFromConfig = await loadAppTitle(slug);
  const title = titleFromConfig ?? formatSlug(slug);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'flex-start',
          background:
            'radial-gradient(circle at 20% 20%, rgba(30, 64, 175, 0.4), transparent 45%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #1f2937 100%)',
          border: '24px solid rgba(15, 23, 42, 0.85)',
          borderRadius: '48px',
          boxShadow: '0 40px 120px rgba(15, 23, 42, 0.75)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Inter", "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          height: '100%',
          justifyContent: 'center',
          padding: '96px',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.25), rgba(14, 165, 233, 0.05))',
            borderRadius: '9999px',
            color: 'rgba(148, 163, 184, 0.85)',
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '0.3em',
            marginBottom: 32,
            padding: '12px 32px',
            textTransform: 'uppercase',
            width: 'fit-content',
          }}
        >
          Kali Linux Portfolio
        </div>
        <div
          style={{
            fontSize: title.length > 20 ? 96 : 120,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: '90%',
            textTransform: 'capitalize',
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
