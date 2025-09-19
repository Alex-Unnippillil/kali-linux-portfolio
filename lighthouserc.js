module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: 'yarn start --hostname 0.0.0.0 --port 3000',
      startServerReadyPattern: 'started server on',
      startServerReadyTimeout: 120000,
      url: ['http://127.0.0.1:3000/'],
      settings: {
        preset: 'desktop',
        emulatedFormFactor: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:pwa': ['error', { minScore: 0.95 }],
        'installable-manifest': ['error', { minScore: 1 }],
        'service-worker': ['error', { minScore: 1 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.report.html',
    },
  },
};
