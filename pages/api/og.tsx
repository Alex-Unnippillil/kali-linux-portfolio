import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';
import projectsJson from '../../data/projects.json';
import { sanitizeLocale, slugify } from '../../lib/og';

interface ProjectRecord {
  id: number;
  title: string;
  description: string;
  stack?: string[];
  tags?: string[];
  year?: number;
  thumbnail?: string;
  type?: string;
}

interface ThemeConfig {
  background: string;
  foreground: string;
  accent: string;
  badgeBorder: string;
  badgeBackground: string;
  muted: string;
  panel: string;
}

const WIDTH = 1200;
const HEIGHT = 630;
const BADGE_LIMIT = 6;
const FALLBACK_TITLE = "Alex Unnippillil's Portfolio";
const FALLBACK_SUBTITLE = 'Security labs, retro games, and Kali-inspired UI';
const FALLBACK_IMAGE = '/images/logos/logo_1200.png';
const FALLBACK_FOOTER = 'unnippillil.com';
const CACHE_CONTROL_HEADER = 'public, s-maxage=86400, stale-while-revalidate=604800';

const THEME_MAP: Record<'dark' | 'light', ThemeConfig> = {
  dark: {
    background: 'linear-gradient(135deg, #050816 0%, #101828 55%, #020617 100%)',
    foreground: '#f8fafc',
    accent: '#38bdf8',
    badgeBorder: 'rgba(56, 189, 248, 0.45)',
    badgeBackground: 'rgba(15, 118, 110, 0.18)',
    muted: '#94a3b8',
    panel: 'rgba(15, 23, 42, 0.6)',
  },
  light: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 55%, #cbd5f5 100%)',
    foreground: '#0f172a',
    accent: '#2563eb',
    badgeBorder: 'rgba(37, 99, 235, 0.35)',
    badgeBackground: 'rgba(37, 99, 235, 0.15)',
    muted: '#475569',
    panel: 'rgba(255, 255, 255, 0.6)',
  },
};

const projects = (projectsJson as ProjectRecord[]).map((project) => ({
  ...project,
  slug: slugify(project.title) || String(project.id),
}));

const toAbsoluteUrl = (value: string | undefined, origin: string): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('data:')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const cleaned = value.startsWith('/') ? value : `/${value}`;
  return `${origin}${cleaned}`;
};

const parseBadges = (params: URLSearchParams, fallback: string[]): string[] => {
  const directBadges = params.getAll('badge').map((badge) => badge.trim()).filter(Boolean);
  const csvBadges = params
    .get('badges')
    ?.split(',')
    .map((badge) => badge.trim())
    .filter(Boolean);

  const merged = [...directBadges, ...(csvBadges ?? []), ...fallback];
  return Array.from(new Set(merged)).slice(0, BADGE_LIMIT);
};

const resolveProject = (projectParam: string | null): ProjectRecord | undefined => {
  if (!projectParam) return undefined;
  const normalized = slugify(projectParam);
  if (!normalized) return undefined;
  return projects.find((project) => project.slug === normalized || String(project.id) === normalized);
};

const formatYear = (value: number | undefined, locale: string): string | undefined => {
  if (!value) return undefined;
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(Date.UTC(value, 0, 1)));
  } catch {
    return String(value);
  }
};

const buildFooter = (project: ProjectRecord | undefined, locale: string): string => {
  if (!project) return 'Edge-optimized Open Graph';
  const parts: string[] = [];
  const year = formatYear(project.year, locale);
  if (year) {
    parts.push(`since ${year}`);
  }
  if (project.type) {
    parts.push(project.type);
  }
  if (project.stack?.length) {
    parts.push(project.stack.join(' + '));
  }
  return parts.join(' • ') || 'Project showcase';
};

export const config = {
  runtime: 'edge' as const,
  preferredRegion: 'iad1',
};

const getSafeText = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

export default async function handler(request: NextRequest): Promise<Response> {
  try {
    const { searchParams, origin } = request.nextUrl;
    const themeKey = searchParams.get('theme') === 'light' ? 'light' : 'dark';
    const theme = THEME_MAP[themeKey];

    const locale = sanitizeLocale(searchParams.get('locale'));
    const project = resolveProject(searchParams.get('project'));

    const title = getSafeText(project?.title ?? searchParams.get('title') ?? undefined, FALLBACK_TITLE);
    const subtitle = getSafeText(project?.description ?? searchParams.get('subtitle') ?? undefined, FALLBACK_SUBTITLE);

    const fallbackBadges: string[] = [];
    if (project?.stack?.length) {
      fallbackBadges.push(...project.stack);
    }
    if (project?.tags?.length) {
      fallbackBadges.push(...project.tags);
    }
    const badges = parseBadges(searchParams, fallbackBadges).slice(0, BADGE_LIMIT);

    const imageUrl = toAbsoluteUrl(searchParams.get('image') ?? project?.thumbnail ?? FALLBACK_IMAGE, origin);

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            backgroundImage: theme.background,
            color: theme.foreground,
            padding: '64px',
            fontFamily: 'Rajdhani, Segoe UI, Ubuntu, sans-serif',
          }}
        >
          <div style={{ display: 'flex', gap: '40px', alignItems: 'stretch' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>{title}</div>
              <div style={{ fontSize: 28, color: theme.muted, maxWidth: '90%' }}>{subtitle}</div>
              {badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      style={{
                        fontSize: 22,
                        borderRadius: 999,
                        padding: '10px 20px',
                        border: `1px solid ${theme.badgeBorder}`,
                        backgroundColor: theme.badgeBackground,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {imageUrl && (
              <div
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 32,
                  overflow: 'hidden',
                  border: `3px solid ${theme.accent}`,
                  backgroundColor: theme.panel,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={imageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  alt="Project thumbnail"
                />
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 24,
              color: theme.muted,
            }}
          >
            <span>{FALLBACK_FOOTER}</span>
            <span>{buildFooter(project, locale)}</span>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': CACHE_CONTROL_HEADER,
        },
      }
    );
  } catch (error) {
    console.error('Failed to render OG image', error);
    return new Response('Failed to render image', {
      status: 500,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  }
}
