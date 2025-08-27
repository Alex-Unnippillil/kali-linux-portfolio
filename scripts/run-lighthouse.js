const { lighthouse } = require('../featureFlags');
const { spawnSync } = require('child_process');

if (!lighthouse) {
  console.log('Lighthouse CI disabled by feature flag');
  process.exit(0);
}

spawnSync('lhci', ['autorun'], { stdio: 'inherit' });
