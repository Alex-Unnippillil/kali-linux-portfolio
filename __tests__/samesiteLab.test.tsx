import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SameSiteLab from '../components/apps/samesite-lab/SameSiteLab';
import * as exportModule from '../components/apps/samesite-lab/exportSession';

jest.mock('../components/apps/samesite-lab/exportSession', () => {
  const actual = jest.requireActual('../components/apps/samesite-lab/exportSession');
  return {
    ...actual,
    exportSessionReport: jest.fn(() => true),
  };
});

const memoryThresholdBytes = 80 * 1024 * 1024; // 80MB headroom for Jest environment
const unhandledRejections: unknown[] = [];
const handleRejection = (reason: unknown) => {
  unhandledRejections.push(reason);
};

let startHeap = 0;

describe('SameSite lab regression', () => {
  beforeAll(() => {
    startHeap = process.memoryUsage().heapUsed;
    process.on('unhandledRejection', handleRejection);
  });

  afterAll(() => {
    process.off('unhandledRejection', handleRejection);
    expect(unhandledRejections).toEqual([]);
    const endHeap = process.memoryUsage().heapUsed;
    const diff = Math.max(0, endHeap - startHeap);
    expect(diff).toBeLessThan(memoryThresholdBytes);
  });

  it('exercises SameSite modes, header checks, and export flow', async () => {
    const user = userEvent.setup();
    const exportSpy = exportModule.exportSessionReport as jest.MockedFunction<
      typeof exportModule.exportSessionReport
    >;
    exportSpy.mockImplementation((session) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      session.headers.Cookie;
      return true;
    });

    render(<SameSiteLab />);

    const modeSelect = screen.getByTestId('mode-select');
    const originToggle = screen.getByTestId('origin-toggle') as HTMLInputElement;
    const refererToggle = screen.getByTestId('referer-toggle') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');
    const submissionLog = screen.getByTestId('submission-log');

    const modes: exportModule.SameSiteMode[] = ['Strict', 'Lax', 'None'];
    const combos = [
      { origin: true, referer: true },
      { origin: true, referer: false },
      { origin: false, referer: true },
      { origin: false, referer: false },
    ];

    let attempts = 0;

    for (const mode of modes) {
      await user.selectOptions(modeSelect, mode);
      for (const combo of combos) {
        if (originToggle.checked !== combo.origin) {
          await user.click(originToggle);
        }
        if (refererToggle.checked !== combo.referer) {
          await user.click(refererToggle);
        }

        for (let i = 0; i < 3; i += 1) {
          await user.click(submitButton);
          attempts += 1;
          const logEntries = await within(submissionLog).findAllByRole('listitem');
          const latest = logEntries[logEntries.length - 1];
          expect(latest).toBeDefined();
          if (latest.textContent?.includes('Rejected')) {
            expect(latest.textContent).toMatch(/SameSite|Origin|Referer/);
          } else {
            expect(latest.textContent).toContain('Accepted');
          }
        }
      }
    }

    await user.click(screen.getByTestId('export-button'));
    await screen.findByText(/Session exported/i);

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const sessionArg = exportSpy.mock.calls[0][0];
    expect(sessionArg.submissions).toHaveLength(attempts);
    expect(sessionArg.submissions.some((entry) => entry.success)).toBe(true);
    sessionArg.submissions
      .filter((entry) => !entry.success)
      .forEach((entry) => {
        expect(entry.reasons.join(' ')).toMatch(/SameSite|Origin|Referer/);
      });

    exportSpy.mockReset();
  });
});
