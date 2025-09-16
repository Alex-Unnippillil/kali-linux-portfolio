import Document, { Html, Head, Main, NextScript } from 'next/document';

const DEFAULT_THEME = 'default';
const DEFAULT_ACCENT = '#1793d1';
const THEME_OPTIONS = new Set(['default', 'dark', 'neon', 'matrix']);
const DARK_THEMES = new Set(['dark', 'neon', 'matrix']);

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawName, ...rawValue] = part.split('=');
    if (!rawName) return acc;
    const trimmedName = rawName.trim();
    if (!trimmedName) return acc;
    let name = trimmedName;
    try {
      name = decodeURIComponent(trimmedName);
    } catch {
      /* ignore malformed encodings */
    }
    const raw = rawValue.join('=').trim();
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      /* ignore malformed encodings */
    }
    if (name) acc[name] = value;
    return acc;
  }, {});
};

const isValidAccent = (accent) => /^#[0-9a-fA-F]{6}$/.test(accent);

const shadeColor = (color, percent) => {
  const value = parseInt(color.slice(1), 16);
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const r = value >> 16;
  const g = (value >> 8) & 0x00ff;
  const b = value & 0x0000ff;
  const newR = Math.round((target - r) * p) + r;
  const newG = Math.round((target - g) * p) + g;
  const newB = Math.round((target - b) * p) + b;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
};

const buildAccentStyles = (accent) => {
  const border = shadeColor(accent, -0.2);
  return {
    '--color-ub-orange': accent,
    '--color-ub-border-orange': border,
    '--color-primary': accent,
    '--color-accent': accent,
    '--color-focus-ring': accent,
    '--color-selection': accent,
    '--color-control-accent': accent,
    accentColor: accent,
  };
};

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const nonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const cookies = parseCookies(ctx?.req?.headers?.cookie ?? '');
    const themeCookie = cookies['kali-theme'];
    const accentCookie = cookies['kali-accent'];
    const theme = THEME_OPTIONS.has(themeCookie) ? themeCookie : DEFAULT_THEME;
    const accent = isValidAccent(accentCookie) ? accentCookie : DEFAULT_ACCENT;
    return { ...initial, nonce, theme, accent };
  }

  render() {
    const { nonce, theme: initialTheme, accent: initialAccent } = this.props;
    const theme = THEME_OPTIONS.has(initialTheme) ? initialTheme : DEFAULT_THEME;
    const accent = isValidAccent(initialAccent) ? initialAccent : DEFAULT_ACCENT;
    const accentStyles = buildAccentStyles(accent);
    return (
      <Html
        lang="en"
        data-csp-nonce={nonce}
        data-theme={theme}
        className={DARK_THEMES.has(theme) ? 'dark' : undefined}
        style={accentStyles}
      >
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0f1317" />
          <script nonce={nonce} src="/theme.js" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
