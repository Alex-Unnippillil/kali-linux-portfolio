import type { Command } from '..';

const demoNmap: Command = {
  name: 'demo nmap',
  help: 'Show sample nmap output',
  run: (_argv, term) => {
    term.term.writeln('');
    [
      'Starting Nmap 7.93 ( https://nmap.org ) at 2024-03-15 12:00 UTC',
      'Nmap scan report for example.com (93.184.216.34)',
      'Host is up (0.013s latency).',
      'Not shown: 998 filtered tcp ports',
      'PORT   STATE SERVICE',
      '80/tcp open  http',
      '443/tcp open https',
      'Nmap done: 1 IP address (1 host up) scanned in 0.20 seconds',
    ].forEach(term.writeLine);
    term.prompt();
  },
};

export default demoNmap;

