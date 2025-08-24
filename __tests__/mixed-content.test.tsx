import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { scan } from '@apps/mixed-content/worker';
import MixedContent from '@apps/mixed-content';

describe('Mixed Content', () => {
  it('detects insecure subresources', () => {
    const html = '<img src="http://example.com/a.png"><script src="http://example.com/a.js"></script>';
    const results = scan(html);
    expect(results).toHaveLength(2);
    const script = results.find((r) => r.tag === 'script');
    expect(script?.category).toBe('active');
    const img = results.find((r) => r.tag === 'img');
    expect(img?.category).toBe('passive');
  });

  it('copies report to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    let workerInstance: any;
    // @ts-ignore
    global.Worker = class {
      onmessage: ((e: any) => void) | null = null;
      constructor() {
        workerInstance = this;
      }
      postMessage() {}
      terminate() {}
    };
    const { getByTestId } = render(<MixedContent />);
    await waitFor(() => expect(workerInstance).toBeDefined());
    const mockResults = [
      {
        tag: 'img',
        attr: 'src',
        url: 'http://example.com/a.png',
        httpsUrl: 'https://example.com/a.png',
        category: 'passive',
        suggestion: 'Replace with https://example.com/a.png',
      },
    ];
    act(() => {
      workerInstance.onmessage({ data: mockResults });
    });
    fireEvent.click(getByTestId('copy-report'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        JSON.stringify(mockResults, null, 2),
      ),
    );
  });
});
