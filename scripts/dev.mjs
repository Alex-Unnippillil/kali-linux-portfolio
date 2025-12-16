import { open, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const DIST_DIR = process.env.NEXT_DIST_DIR || '.next-dev';

const rawArgs = process.argv.slice(2);
let cliWantsClean = false;
let cliWantsTurbo = false;
let cliWantsNoTurbo = false;
const forwardedArgs = [];

for (const arg of rawArgs) {
  if (arg === '--clean' || arg === '--clean-dist' || arg === '--reset-cache') {
    cliWantsClean = true;
    continue;
  }
  if (arg === '--turbo') {
    cliWantsTurbo = true;
    forwardedArgs.push(arg);
    continue;
  }
  if (arg === '--no-turbo') {
    cliWantsNoTurbo = true;
    continue;
  }
  forwardedArgs.push(arg);
}

const SHOULD_CLEAN_DIST =
  cliWantsClean ||
  process.env.NEXT_CLEAN_DIST === 'true' ||
  process.env.NEXT_CLEAN_DIST === '1' ||
  process.env.NEXT_CLEAN === 'true' ||
  process.env.NEXT_CLEAN === '1';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runCmdCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr?.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${String(err)}` });
    });
  });
}

async function traceFileWritable(distDir) {
  const tracePath = path.join(distDir, 'trace');
  try {
    const handle = await open(tracePath, 'a');
    await handle.close();
    return true;
  } catch (err) {
    if (err?.code === 'ENOENT') return true; // dir doesn't exist yet; fine
    return err;
  }
}

async function maybeKillStaleNextDev({ distDir }) {
  if (process.platform !== 'win32') return false;

  // Only attempt this recovery if the trace file is the thing failing.
  const traceCheck = await traceFileWritable(distDir);
  if (traceCheck === true) return false;
  if (traceCheck?.code !== 'EPERM') return false;

  const portsToCheck = [3000, 3001, 3002];
  const pids = new Set();

  // Use netstat to find listeners on common Next dev ports.
  const netstat = await runCmdCapture('cmd.exe', ['/d', '/s', '/c', 'netstat -ano -p tcp']);
  if (netstat.code === 0) {
    for (const port of portsToCheck) {
      const re = new RegExp(String.raw`:${port}\s+.*\s+LISTENING\s+(\d+)\s*$`, 'gim');
      let m;
      while ((m = re.exec(netstat.stdout))) {
        if (m[1]) pids.add(m[1]);
      }
    }
  }

  if (pids.size === 0) {
    console.warn(
      `[dev] Detected locked ${path.join(distDir, 'trace')} but could not find a listening dev server PID to stop.`,
    );
    return false;
  }

  const repoRoot = path.resolve(process.cwd()).toLowerCase();
  const markers = [
    ' next dev',
    '\\next\\dist\\bin\\next',
    'scripts\\dev.mjs',
    distDir.toLowerCase(),
    repoRoot,
  ];

  let killedAny = false;
  for (const pid of pids) {
    // Query command line so we don't kill unrelated processes.
    const ps = await runCmdCapture('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
    ]);
    const cmdline = (ps.stdout || '').trim();
    const haystack = cmdline.toLowerCase();

    const looksLikeThisRepoNext =
      haystack.includes('node') &&
      (markers.some((m) => haystack.includes(m)) || haystack.includes('kali-linux-portfolio'));

    if (!looksLikeThisRepoNext) continue;

    console.warn(
      `[dev] ${path.join(distDir, 'trace')} is locked. Stopping stale dev process (PID ${pid}) to recover...`,
    );
    await runCmdCapture('cmd.exe', ['/d', '/s', '/c', `taskkill /PID ${pid} /T /F`]);
    killedAny = true;
  }

  if (killedAny) {
    // Give Windows a moment to release file handles.
    await sleep(500);
  }

  return killedAny;
}

async function removeNextDir(distDir) {
  // On Windows, .next/trace can occasionally be locked by a crashed process or AV scanner.
  // Best-effort cleanup with retries to reduce EPERM flakiness.
  const retries = 5;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await rm(distDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 150 });
      return;
    } catch (err) {
      // If a previous dev server is still running, it can hold `${distDir}/trace` open and
      // cause Next to crash immediately on startup. Try to stop the stale process once.
      if (attempt === 0 && err?.code === 'EPERM') {
        const killed = await maybeKillStaleNextDev({ distDir });
        if (killed) {
          await sleep(200);
          continue;
        }
      }
      // Final attempt: proceed without blocking dev server start.
      if (attempt === retries - 1) {
        console.warn(
          `[dev] Warning: failed to remove ${distDir} directory:`,
          err?.message ?? err,
        );
        return;
      }
      await sleep(200 * (attempt + 1));
    }
  }
}

// IMPORTANT: Do NOT wipe the dist directory on every run. That defeats Next.js' incremental cache
// and makes subsequent dev startups + first compiles dramatically slower (especially on Windows).
// Only clean when explicitly requested or when recovery requires it.
await maybeKillStaleNextDev({ distDir: DIST_DIR });
if (SHOULD_CLEAN_DIST) {
  console.log(`[dev] Cleaning ${DIST_DIR} (NEXT_CLEAN_DIST=1)`);
  await removeNextDir(DIST_DIR);
}

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? '1',
  NEXT_DIST_DIR: DIST_DIR,
};

const TURBO =
  (cliWantsTurbo ||
    process.env.NEXT_TURBO === 'true' ||
    process.env.NEXT_TURBO === '1' ||
    process.env.TURBO === 'true' ||
    process.env.TURBO === '1') &&
  !cliWantsNoTurbo;

// Prefer running the local Next.js binary via `node` instead of `npx` to reduce startup overhead
// and avoid Windows `.cmd` spawn quirks.
const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');
const nextArgs = [nextBin, 'dev', ...forwardedArgs];
if (TURBO && !nextArgs.includes('--turbo')) nextArgs.push('--turbo');

const child = spawn('node', nextArgs, { stdio: 'inherit', env });

child.on('exit', (code) => process.exit(code ?? 1));

