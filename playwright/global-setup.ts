import { execSync } from 'node:child_process';

const commands = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'
  ? [
      { label: 'TypeScript typecheck', command: 'yarn typecheck' },
      { label: 'ESLint', command: 'yarn qa:desktop-shell:lint' },
      { label: 'Next.js build', command: 'yarn build' },
    ]
  : [];

export default async function globalSetup(): Promise<void> {
  if (!commands.length) {
    return;
  }
  for (const { label, command } of commands) {
    console.log(`\n[desktop-shell] Running ${label}: ${command}`);
    execSync(command, { stdio: 'inherit' });
  }
}
