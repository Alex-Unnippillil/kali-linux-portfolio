export const hookFixtures = [
  {
    id: 'demo123',
    name: 'Demo Browser',
    os: 'Ubuntu 20.04',
    ip: '127.0.0.1',
    ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
    status: 'online',
  },
];

export const moduleFixtures = [
  {
    id: 'alert',
    name: 'Alert Box',
    description: 'Displays a simple alert dialog in the hooked browser.',
    result: 'Alert executed.',
  },
  {
    id: 'getCookies',
    name: 'Get Cookies',
    description: 'Retrieves document.cookie from the hooked browser.',
    result: 'sessionid=abc123;',
  },
];
