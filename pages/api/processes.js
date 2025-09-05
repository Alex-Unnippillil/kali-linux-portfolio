import { exec } from 'child_process';

export default function handler(req, res) {
  exec('ps -eo pid,ppid,pcpu,pmem,comm --no-headers', (err, stdout) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const lines = stdout.trim().split('\n').filter(Boolean);
    const processes = lines.map((line) => {
      const [pid, ppid, cpu, mem, command] = line.trim().split(/\s+/, 5);
      return {
        pid: Number(pid),
        ppid: Number(ppid),
        cpu: Number(cpu),
        mem: Number(mem),
        name: command,
      };
    });
    res.status(200).json({ processes });
  });
}
