import type { Command } from '..';

const demoHashcat: Command = {
  name: 'demo hashcat',
  help: 'Show sample hashcat output',
  run: (_argv, term) => {
    term.term.writeln('');
    [
      'hashcat (v6.2.6) starting in benchmark mode...',
      'OpenCL API (OpenCL 2.1) - Platform #1 [MockGPU]',
      '* Device #1: Example GPU, 4096/8192 MB (1024 MB allocatable), 64MCU',
      'Benchmark relevant options:',
      '==========================',
      '* --optimized-kernel-enable',
      '--------------------------',
      'Hashmode: 0 - MD5',
      'Speed.#1.........: 12345.0 MH/s (10.00ms) @ Accel:32 Loops:1024 Thr:256 Vec:8',
      'Started: Fri Mar 15 12:00:00 2024',
      'Stopped: Fri Mar 15 12:00:01 2024',
    ].forEach(term.writeLine);
    term.prompt();
  },
};

export default demoHashcat;

