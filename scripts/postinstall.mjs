import { execSync } from 'node:child_process';

if (process.env.CI !== 'true') {
  // When invoked directly via `node scripts/postinstall.mjs` the
  // `simple-git-hooks` binary from `node_modules/.bin` may not be on the PATH
  // which causes the previous command to fail. Using `npx` ensures we resolve
  // the local package correctly regardless of how the script is executed.
  execSync('npx simple-git-hooks', { stdio: 'inherit' });
}
