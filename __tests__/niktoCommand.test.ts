import { buildNiktoCommand } from '../utils/nikto/buildCommand';

describe('buildNiktoCommand', () => {
  it('returns a simulated command with defaults', () => {
    expect(
      buildNiktoCommand({ host: 'demo', port: '80', useSsl: false, labSimulation: true })
    ).toBe('nikto -h demo -p 80  # simulation only');
  });

  it('supports advanced flags and quoting', () => {
    expect(
      buildNiktoCommand({
        useInputFile: true,
        inputFile: 'targets scope.txt',
        port: '443',
        useSsl: true,
        tuning: '123',
        plugins: ['apache_expect_xss', 'dir_traversal'],
        randomizeUserAgent: true,
        userAgent: 'Mozilla/5.0',
        outputFormat: 'json',
        outputFile: 'report final.json',
        labSimulation: true,
      })
    ).toBe(
      'nikto -i "targets scope.txt" -p 443 -ssl -Tuning 123 -Plugins apache_expect_xss,dir_traversal -useragent "Mozilla/5.0 [randomized]" -output "report final.json" -Format json  # simulation only'
    );
  });
});
