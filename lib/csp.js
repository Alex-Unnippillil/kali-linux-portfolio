const scriptSrcHosts = [
  'https://vercel.live',
  'https://platform.twitter.com',
  'https://syndication.twitter.com',
  'https://cdn.syndication.twimg.com',
  'https://www.youtube.com',
  'https://www.google.com',
  'https://www.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://sdk.scdn.co',
];

const connectSrcHosts = [
  'https://example.com',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
  'https://www.google.com',
  'https://platform.twitter.com',
  'https://syndication.twitter.com',
  'https://cdn.syndication.twimg.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://*.google.com',
  'https://stackblitz.com',
];

const frameSrcHosts = [
  'https://vercel.live',
  'https://stackblitz.com',
  'https://ghbtns.com',
  'https://platform.twitter.com',
  'https://open.spotify.com',
  'https://todoist.com',
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://*.google.com',
  'https://syndication.twitter.com',
  'https://*.twitter.com',
  'https://*.x.com',
  'https://react.dev',
  'https://example.com',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
];

const scriptSrcHostsString = scriptSrcHosts.join(' ');
const connectSrcHostsString = connectSrcHosts.join(' ');
const frameSrcHostsString = frameSrcHosts.join(' ');

module.exports = {
  scriptSrcHosts,
  connectSrcHosts,
  frameSrcHosts,
  scriptSrcHostsString,
  connectSrcHostsString,
  frameSrcHostsString,
};
