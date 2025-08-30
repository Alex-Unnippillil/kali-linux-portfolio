import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';

const logFile = process.argv[2] || 'yarn-install.log';
const banned = ['glob@7', 'inflight@1.0.6', 'source-map@0.8.0-beta.0'];

const log = readFileSync(logFile, 'utf8');
for (const pattern of banned) {
  if (log.includes(pattern)) {
    console.error(`Forbidden dependency found in install log: ${pattern}`);
    process.exit(1);
  }
}

const whyOutput = execSync('yarn why glob && yarn why inflight && yarn why source-map', {encoding: 'utf8'});
for (const pattern of banned) {
  if (whyOutput.includes(pattern)) {
    console.error(`Forbidden dependency found via yarn why: ${pattern}`);
    process.exit(1);
  }
}

console.log('Dependency check passed');
