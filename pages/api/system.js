import os from 'os';
import fs from 'fs';

export default function handler(req, res) {
  const uptime = os.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let swapTotal = 0;
  let swapFree = 0;
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
    const totalMatch = meminfo.match(/SwapTotal:\s+(\d+) kB/);
    const freeMatch = meminfo.match(/SwapFree:\s+(\d+) kB/);
    if (totalMatch) swapTotal = parseInt(totalMatch[1], 10) * 1024;
    if (freeMatch) swapFree = parseInt(freeMatch[1], 10) * 1024;
  } catch {
    /* ignore */
  }
  const swapUsed = swapTotal - swapFree;

  const load = os.loadavg()[0];
  const cpuCount = os.cpus().length || 1;
  const cpuPercent = Math.min(100, (load / cpuCount) * 100);

  res.status(200).json({
    uptime,
    cpuPercent,
    ramPercent: (usedMem / totalMem) * 100,
    swapPercent: swapTotal ? (swapUsed / swapTotal) * 100 : 0,
    descriptions: {
      cpu: 'Plugin: CPU monitor - displays server load',
      ram: 'Plugin: RAM monitor - tracks memory usage',
      swap: 'Plugin: Swap monitor - tracks swap usage',
    },
  });
}
