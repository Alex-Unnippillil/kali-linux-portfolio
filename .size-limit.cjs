const filePlugin = require('@size-limit/file');

const limits = [
  {
    name: 'pages/_app bundle',
    path: ['.next/static/chunks/pages/_app-*.js'],
    limit: '525 KB',
  },
  {
    name: 'framework chunk',
    path: ['.next/static/chunks/framework-*.js'],
    limit: '205 KB',
  },
  {
    name: 'main runtime',
    path: ['.next/static/chunks/main-*.js'],
    limit: '145 KB',
  },
];

module.exports = limits;
module.exports.plugins = [filePlugin];
