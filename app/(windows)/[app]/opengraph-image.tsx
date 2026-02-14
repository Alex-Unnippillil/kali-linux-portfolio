import { ImageResponse } from 'next/og';
import type { CSSProperties } from 'react';

type WindowsOgParams = {
  params: {
    app?: string;
  };
};

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const FALLBACK_TITLE = 'Kali Linux Portfolio';

const ACRONYM_REPLACEMENTS = new Map<string, string>([
  ['http', 'HTTP'],
  ['https', 'HTTPS'],
  ['ssh', 'SSH'],
  ['ftp', 'FTP'],
  ['nse', 'NSE'],
  ['nmap', 'Nmap'],
  ['msf', 'MSF'],
  ['qr', 'QR'],
]);

const toTitleCase = (segment: string): string => {
  const trimmed = segment.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (ACRONYM_REPLACEMENTS.has(lower)) {
    return ACRONYM_REPLACEMENTS.get(lower)!;
  }

  if (/^[0-9]+$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.length <= 3 && /^[a-z]+$/.test(lower)) {
    return trimmed.toUpperCase();
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

const formatAppTitle = (value: string | undefined): string => {
  if (!value) return FALLBACK_TITLE;

  const safeDecoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  })();

  const normalized = safeDecoded
    .replace(/\+/g, ' ')
    .replace(/[\-_]+/g, ' ')
    .trim();

  if (!normalized) return FALLBACK_TITLE;

  const segments = normalized
    .split(' ')
    .map((part) => toTitleCase(part))
    .filter(Boolean);

  return segments.length ? segments.join(' ') : FALLBACK_TITLE;
};

const frameStyles: CSSProperties = {
  width: '1000px',
  borderRadius: '28px',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  boxShadow: '0 32px 80px rgba(15, 23, 42, 0.65)',
  background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '28px 36px',
  background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.75) 100%)',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
};

const contentStyles: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '72px 96px',
  background:
    'radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 60%)',
};

const accentStyles: CSSProperties = {
  display: 'flex',
  gap: '14px',
};

const buttonStyles: CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '9999px',
  boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
};

const titleStyles: CSSProperties = {
  fontSize: '64px',
  lineHeight: 1.1,
  fontWeight: 700,
  color: '#e2e8f0',
  letterSpacing: '-0.02em',
  textShadow: '0 18px 38px rgba(8, 47, 73, 0.55)',
};

const taglineStyles: CSSProperties = {
  marginTop: '28px',
  fontSize: '32px',
  color: 'rgba(226, 232, 240, 0.82)',
  maxWidth: '80%',
  lineHeight: 1.4,
};

const footerStyles: CSSProperties = {
  marginTop: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '18px',
  padding: '16px 22px',
  borderRadius: '16px',
  background: 'rgba(15, 118, 110, 0.22)',
  color: '#5eead4',
  fontSize: '28px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

export default function WindowsOpenGraphImage({
  params,
}: WindowsOgParams): ImageResponse {
  const title = formatAppTitle(params?.app);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.2), transparent 55%), #020617',
          fontFamily: '"Segoe UI", Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={frameStyles}>
          <div style={headerStyles}>
            <div style={accentStyles}>
              <div style={{ ...buttonStyles, background: '#f87171' }} />
              <div style={{ ...buttonStyles, background: '#facc15' }} />
              <div style={{ ...buttonStyles, background: '#4ade80' }} />
            </div>
            <div
              style={{
                marginLeft: 'auto',
                fontSize: '34px',
                fontWeight: 600,
                color: 'rgba(248, 250, 252, 0.92)',
                letterSpacing: '0.04em',
              }}
            >
              {title}
            </div>
          </div>
          <div style={contentStyles}>
            <div style={titleStyles}>{title}</div>
            <div style={taglineStyles}>
              A Kali-inspired desktop window showcasing interactive security tools,
              utilities, and games built for the web.
            </div>
            <div style={footerStyles}>
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(45, 212, 191, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                ⌘
              </span>
              Kali Linux Portfolio
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
