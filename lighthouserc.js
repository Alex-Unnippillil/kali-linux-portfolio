const featureFlags = require('./featureFlags');

module.exports = featureFlags.lighthouse
  ? {
      ci: {
        collect: {
          startServerCommand: 'yarn dev',
          url: ['http://localhost:3000/'],
          numberOfRuns: 1,
        },
        upload: {
          target: 'filesystem',
          outputDir: './lighthouse',
          formats: ['json'],
        },
      },
    }
  : {};
