import fs from 'fs';
import path from 'path';

const readMan = (name: string) => {
  const filePath = path.join(process.cwd(), 'apps/terminal/man', name);
  return fs.readFileSync(filePath, 'utf8').trim();
};

describe('terminal man pages', () => {
  it('includes history, sudo, cp, mv, and security docs', () => {
    expect(readMan('history.txt')).toContain('history');
    expect(readMan('sudo.txt')).toContain('sudo');
    expect(readMan('cp.txt')).toContain('cp');
    expect(readMan('mv.txt')).toContain('mv');
    expect(readMan('security.txt')).toContain('security');
  });
});
