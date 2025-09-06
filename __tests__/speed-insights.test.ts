import { describe, it, expect } from '@jest/globals';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

// Ensure the Speed Insights script endpoint responds successfully.
describe('Speed Insights script', () => {
  it('returns 200 from /_vercel/speed-insights/script.js', async () => {
    const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" https://vercel.live/_vercel/speed-insights/script.js');
    expect(stdout.trim()).toBe('200');
  });
});
