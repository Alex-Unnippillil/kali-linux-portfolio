const baseDirectives = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "img-src": [
    "'self'",
    'data:',
    'https://ghchart.rshah.org',
    'https://img.shields.io',
    'https://images.credly.com',
    'https://data.typeracer.com',
    'https://icons.duckduckgo.com',
    'https://i.ytimg.com',
    'https://yt3.ggpht.com',
    'https://staticmap.openstreetmap.de',
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "style-src-elem": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    'https://vercel.live',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://www.youtube.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
  ],
  "connect-src": [
    "'self'",
    'https://vercel.live',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://syndication.twitter.com',
    'https://cdn.syndication.twimg.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://stackblitz.com',
    'https://vscode.dev',
    'https://api.github.com',
    'https://github-contributions-api.jogruber.de',
    'https://api.open-meteo.com',
    'https://geocoding-api.open-meteo.com',
    'https://api.openweathermap.org',
    'https://api.exchangerate.host',
    'https://jsonplaceholder.typicode.com',
    'https://ifconfig.me',
    'https://speed.cloudflare.com',
    'https://www.googleapis.com',
    'https://www.youtube.com',
    'https://www.google.com',
    'https://www.gstatic.com',
    'https://ipapi.co',
    'https://unpkg.com',
  ],
  "frame-src": [
    "'self'",
    'https://vercel.live',
    'https://stackblitz.com',
    'https://vscode.dev',
    'https://platform.twitter.com',
    'https://embed.x.com',
    'https://*.twitter.com',
    'https://*.x.com',
    'https://open.spotify.com',
    'https://www.youtube-nocookie.com',
    'https://react.dev',
  ],
  "frame-ancestors": ["'self'"],
  'upgrade-insecure-requests': [],
};

function buildCsp({ nonce, allowUnsafeEval = false } = {}) {
  return Object.entries(baseDirectives)
    .map(([directive, values]) => {
      if (directive === 'script-src') {
        const scriptValues = [...values];
        if (nonce) {
          scriptValues.push(`'nonce-${nonce}'`);
        }
        if (allowUnsafeEval) {
          scriptValues.push("'unsafe-eval'");
        }
        return `${directive} ${scriptValues.join(' ')}`;
      }

      if (!values.length) {
        return directive;
      }

      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

module.exports = { baseDirectives, buildCsp };
