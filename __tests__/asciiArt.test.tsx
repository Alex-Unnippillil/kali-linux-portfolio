import { render, fireEvent } from '@testing-library/react';
import AsciiArt from '../components/apps/ascii_art';

describe('AsciiArt file handling', () => {
  beforeEach(() => {
    (global as any).URL.createObjectURL = jest
      .fn()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    (global as any).URL.revokeObjectURL = jest.fn();
    (global as any).createImageBitmap = jest.fn(() => Promise.resolve({ width: 1, height: 1 }));
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0 as any;
    };
    (document as any).fonts = { load: jest.fn() };
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      imageSmoothingEnabled: true,
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillText: jest.fn(),
    }));
  });

  test('releases object URLs on file change and unmount', async () => {
    const { container, unmount } = render(<AsciiArt />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const file1 = new File(['a'], 'a.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file1], configurable: true });
    await fireEvent.change(input);

    const file2 = new File(['b'], 'b.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file2], configurable: true });
    await fireEvent.change(input);

    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');

    unmount();
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });
});
