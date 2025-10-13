import Document, { Html, Head, Main, NextScript } from 'next/document';

const DEFAULT_SITE_URL = 'https://unnippillil.com';

function normalizeBasePath(rawValue) {
  if (!rawValue) return '/';
  const trimmed = rawValue.trim();
  if (!trimmed) return '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const sanitized = withLeadingSlash.replace(/\/{2,}/g, '/');
  if (sanitized === '/' || sanitized === '') {
    return '/';
  }
  return sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized;
}

function stripQueryAndHash(value) {
  if (!value) return '/';
  const index = value.search(/[?#]/);
  const base = index === -1 ? value : value.slice(0, index);
  return base || '/';
}

function normalizeRoutePath(rawPath) {
  if (!rawPath) return '/';
  const trimmed = rawPath.trim();
  if (!trimmed) return '/';
  const withLeading = (trimmed.startsWith('/') ? trimmed : `/${trimmed}`).replace(/\/{2,}/g, '/');
  if (withLeading === '/' || withLeading === '') {
    return '/';
  }
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

function removeBasePath(pathname, basePath) {
  const normalizedBase = basePath ?? '/';
  const normalizedPath = normalizeRoutePath(pathname);
  if (normalizedBase !== '/' && normalizedPath.startsWith(normalizedBase)) {
    const remainder = normalizedPath.slice(normalizedBase.length) || '/';
    return normalizeRoutePath(remainder);
  }
  return normalizedPath;
}

function joinBasePath(basePath, routePath) {
  const base = basePath === '/' ? '' : basePath;
  if (routePath === '/' || routePath === '') {
    return base || '/';
  }
  const joined = `${base}${routePath}`.replace(/\/{2,}/g, '/');
  return joined.endsWith('/') && joined !== '/' ? joined.slice(0, -1) : joined;
}

function resolveSiteUrl(rawValue) {
  const fallback = DEFAULT_SITE_URL;
  if (!rawValue) return fallback;
  const trimmed = rawValue.trim();
  if (!trimmed) return fallback;
  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed.replace(/^\/+|\/+$/g, '')}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return fallback;
  }
}

function resolveEnvironment() {
  return {
    basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? ''),
    siteUrl: resolveSiteUrl(
      process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.SITE_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        DEFAULT_SITE_URL
    ),
  };
}

function resolveCanonicalFromContext(ctx) {
  const { basePath, siteUrl } = resolveEnvironment();
  const rawPath = stripQueryAndHash(ctx?.asPath ?? ctx?.pathname ?? '/');
  const routePath = removeBasePath(rawPath, basePath);
  return buildCanonicalUrl(siteUrl, basePath, routePath);
}

function buildCanonicalUrl(siteUrl, basePath, routePath) {
  const normalizedRoute = normalizeRoutePath(routePath);
  const fullPath = joinBasePath(basePath, normalizedRoute);
  return `${siteUrl}${fullPath === '/' ? '/' : fullPath}`;
}

class MyDocument extends Document {
  /**
   * @param {import('next/document').DocumentContext} ctx
   */
  static async getInitialProps(ctx) {
    const initial = await Document.getInitialProps(ctx);
    const rawNonce = ctx?.res?.getHeader?.('x-csp-nonce');
    const nonceValue = Array.isArray(rawNonce) ? rawNonce[0] : rawNonce;
    const nonce = typeof nonceValue === 'number' ? String(nonceValue) : nonceValue;
    const canonicalUrl = resolveCanonicalFromContext(ctx);
    return { ...initial, nonce, canonicalUrl };
  }

  render() {
    const { nonce, canonicalUrl } = this.props;
    const { basePath, siteUrl } = resolveEnvironment();
    const resolvedCanonical = canonicalUrl ?? buildCanonicalUrl(siteUrl, basePath, '/');

    return (
      <Html lang="en" data-csp-nonce={nonce}>
        <Head>
          <link rel="canonical" href={resolvedCanonical} />
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
