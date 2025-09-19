import { assessFileSafety, createFileSafetySession } from '../utils/fileSafety';

describe('fileSafety', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('assessFileSafety', () => {
    it('flags executable extensions like .exe', () => {
      const result = assessFileSafety({ name: 'payload.EXE' });
      expect(result.isRisky).toBe(true);
      expect(result.matchedExtension).toBe('.exe');
      expect(result.reasons.some((reason) => reason.toLowerCase().includes('executable'))).toBe(true);
    });

    it('flags shell scripts like .sh', () => {
      const result = assessFileSafety({ name: 'install.sh', type: 'application/x-sh' });
      expect(result.isRisky).toBe(true);
      expect(result.matchedExtension).toBe('.sh');
      expect(result.matchedMimeType).toBe('application/x-sh');
    });

    it('flags powershell scripts like .ps1', () => {
      const result = assessFileSafety({ name: 'script.ps1', type: 'text/x-powershell' });
      expect(result.isRisky).toBe(true);
      expect(result.matchedExtension).toBe('.ps1');
      expect(result.matchedMimeType).toBe('text/x-powershell');
    });

    it('flags risky MIME types even with benign extension', () => {
      const result = assessFileSafety({ name: 'readme.txt', type: 'application/x-msdownload' });
      expect(result.isRisky).toBe(true);
      expect(result.matchedMimeType).toBe('application/x-msdownload');
    });

    it('allows safe files', () => {
      const result = assessFileSafety({ name: 'notes.txt', type: 'text/plain' });
      expect(result.isRisky).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('createFileSafetySession', () => {
    it('tracks consent per file fingerprint', () => {
      const session = createFileSafetySession({ context: 'test-suite' });
      const shellFile = { name: 'installer.sh', size: 1200, lastModified: 1700000000000 };
      const shellRisk = assessFileSafety(shellFile);
      expect(session.hasConsent(shellFile)).toBe(false);
      session.recordDecision(shellFile, 'proceed', { risk: shellRisk });
      expect(session.hasConsent(shellFile)).toBe(true);

      const otherFile = { name: 'other.sh', size: 800, lastModified: 1700000000100 };
      const otherRisk = assessFileSafety(otherFile);
      session.recordDecision(otherFile, 'cancel', { risk: otherRisk });
      expect(session.hasConsent(otherFile)).toBe(false);
    });
  });
});
