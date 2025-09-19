const overrides = [
  // Mini-apps and retro games are intentionally verbose simulations.
  // They pre-date the stricter lint rules and would require major rewrites.
  {
    files: ['components/apps/**/*.{js,jsx,ts,tsx}'],
    rules: {
      complexity: 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
    },
  },
  // Legacy static bundles under public/ rely on DOM globals and large functions.
  {
    files: ['public/apps/**/*.{js,jsx}', 'public/workbox-*.js'],
    rules: {
      complexity: 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
    },
  },
  // API stubs simulate complex tooling flows; track their complexity separately.
  {
    files: ['pages/api/contact.js', 'pages/api/hydra.js'],
    rules: {
      complexity: 'off',
    },
  },
  // Long-form report pages intentionally mirror original documents.
  {
    files: ['pages/nessus-report.tsx', 'pages/nikto-report.tsx', 'pages/qr/index.tsx'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
];

export default overrides;
