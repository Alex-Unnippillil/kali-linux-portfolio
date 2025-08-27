import React from 'react';
import { render, act } from '@testing-library/react';
import AsciiArt from '../components/apps/ascii_art';

describe('DOMPurify integration', () => {
  let workerInstance: any;
  let OriginalWorker: any;

  beforeEach(() => {
    workerInstance = null;
    OriginalWorker = (global as any).Worker;
    // Mock Worker for component initialization
    (global as any).Worker = class {
      public onmessage: any = () => {};
      constructor() {
        workerInstance = this;
      }
      postMessage() {}
      terminate() {}
    } as any;
  });

  afterEach(() => {
    (global as any).Worker = OriginalWorker;
  });

  const updateHtml = (html: string) => {
    act(() => {
      workerInstance.onmessage({
        data: {
          plain: '',
          html,
          ansi: '',
          colors: new Uint8ClampedArray(),
          width: 1,
          height: 1,
        },
      });
    });
  };

  it('renders sanitized output', () => {
    const { container } = render(<AsciiArt />);
    updateHtml('<b>SAFE</b>');
    const pre = container.querySelector('pre');
    expect(pre?.innerHTML).toBe('<b>SAFE</b>');
  });

  it('removes unsafe tags and attributes', () => {
    const { container } = render(<AsciiArt />);
    updateHtml('<img src="x" onerror="alert(1)"><script>alert(1)</script><b>OK</b>');
    const pre = container.querySelector('pre');
    expect(pre?.innerHTML).toContain('<b>OK</b>');
    expect(pre?.innerHTML).not.toContain('<script>');
    expect(pre?.innerHTML).not.toContain('onerror');
  });
});

