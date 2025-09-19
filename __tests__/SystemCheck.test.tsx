import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import SystemCheck, {
  SystemCheckResult,
  formatSystemReport,
} from '@/components/apps/diagnostics/SystemCheck';
import { copyToClipboard } from '@/utils/clipboard';

jest.mock('@/utils/clipboard', () => {
  const copyMock = jest.fn();
  return {
    __esModule: true,
    copyToClipboard: copyMock,
    default: copyMock,
  };
});

describe('SystemCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats markdown report with storage and skew information', () => {
    const sample: SystemCheckResult = {
      os: 'Test OS',
      browser: 'Chrome 120',
      gpu: 'Test GPU',
      storage: { usage: 1024 * 1024, quota: 2 * 1024 * 1024 },
      timeSkewMs: 42,
      timezone: 'UTC',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    const markdown = formatSystemReport(sample);
    expect(markdown).toContain('# System Check Report');
    expect(markdown).toContain('**OS:** Test OS');
    expect(markdown).toContain('**Storage:** 1 MB of 2 MB (50.0%)');
    expect(markdown).toContain('**Time skew:** 42 ms (system vs monotonic clock)');
    expect(markdown).toContain('**Timezone:** UTC');
  });

  it('collects browser data and copies formatted markdown', async () => {
    const copyMock = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;
    copyMock.mockResolvedValue(true);

    const storageEstimate = { quota: 2 * 1024 * 1024, usage: 1024 * 1024 };
    const storageMock = jest.fn().mockResolvedValue(storageEstimate);

    const originalUserAgent = navigator.userAgent;
    const originalPlatform = navigator.platform;
    const originalStorage = (navigator as any).storage;

    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'Win32',
    });
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: { estimate: storageMock },
    });

    const glDebugInfo = {
      UNMASKED_VENDOR_WEBGL: 'UNMASKED_VENDOR_WEBGL',
      UNMASKED_RENDERER_WEBGL: 'UNMASKED_RENDERER_WEBGL',
    };
    const glContext = {
      getExtension: jest
        .fn()
        .mockImplementation((name: string) => (name === 'WEBGL_debug_renderer_info' ? glDebugInfo : null)),
      getParameter: jest.fn().mockImplementation((param: string) => {
        if (param === glDebugInfo.UNMASKED_VENDOR_WEBGL) return 'TestVendor';
        if (param === glDebugInfo.UNMASKED_RENDERER_WEBGL) return 'TestRenderer';
        if (param === 'RENDERER') return 'GenericRenderer';
        return null;
      }),
      RENDERER: 'RENDERER',
    } as unknown as WebGLRenderingContext;

    const originalCreateElement = document.createElement;
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: jest.fn().mockReturnValue(glContext),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement.call(document, tagName);
    });

    const originalTimeOriginDescriptor = Object.getOwnPropertyDescriptor(performance, 'timeOrigin');
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 2000);
    const performanceNowSpy = jest.spyOn(performance, 'now').mockImplementation(() => 900);
    Object.defineProperty(performance, 'timeOrigin', {
      configurable: true,
      get: () => 1000,
    });

    try {
      render(<SystemCheck />);

      await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument());

      const copyButton = screen.getByRole('button', { name: /copy report/i });
      fireEvent.click(copyButton);

      await waitFor(() => expect(copyMock).toHaveBeenCalledTimes(1));

      const markdown = copyMock.mock.calls[0][0];
      expect(markdown).toContain('**OS:** Windows');
      expect(markdown).toContain('**Browser:** Chrome 120.0.0.0');
      expect(markdown).toContain('**GPU:** TestVendor · TestRenderer');
      expect(markdown).toContain('**Storage:** 1 MB of 2 MB (50.0%)');
      expect(markdown).toContain('**Time skew:** 100 ms (system vs monotonic clock)');

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Report copied to clipboard.'));
    } finally {
      createElementSpy.mockRestore();
      dateNowSpy.mockRestore();
      performanceNowSpy.mockRestore();
      if (originalTimeOriginDescriptor) {
        Object.defineProperty(performance, 'timeOrigin', originalTimeOriginDescriptor);
      }
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: originalUserAgent,
      });
      Object.defineProperty(window.navigator, 'platform', {
        configurable: true,
        value: originalPlatform,
      });
      if (originalStorage) {
        Object.defineProperty(window.navigator, 'storage', {
          configurable: true,
          value: originalStorage,
        });
      } else {
        delete (window.navigator as any).storage;
      }
    }
  });
});

