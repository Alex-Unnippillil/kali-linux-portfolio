import { execSync } from 'node:child_process';

if (process.env.CI !== 'true') {
  execSync('simple-git-hooks', { stdio: 'inherit' });
}
