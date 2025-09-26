const defaultUrl = 'http://localhost:3000/';

export default {
  ci: {
    collect: {
      url: [process.env.LHCI_URL ?? defaultUrl],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        disableFullPageScreenshot: true,
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
      reportFilenamePattern: 'lighthouse-%%PATHNAME%%-%%DATETIME%%.%%EXTENSION%%',
    },
  },
};
