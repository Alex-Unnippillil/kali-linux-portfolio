import { fireEvent, render, screen } from '@testing-library/react';
import SpriteStripPreview from '../components/SpriteStripPreview';
import { importSpriteStrip, clearSpriteStripCache } from '../utils/spriteStrip';

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalFocus = HTMLElement.prototype.focus;

const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  imageSmoothingEnabled: true,
} as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,frame');
  HTMLElement.prototype.focus = function focus() {
    // jsdom doesn't implement focus fully; this is a noop shim so we can call element.focus()
  };
});

afterEach(() => {
  mockContext.clearRect = jest.fn();
  mockContext.drawImage = jest.fn();
  (HTMLCanvasElement.prototype.getContext as jest.Mock).mockClear();
  (HTMLCanvasElement.prototype.toDataURL as jest.Mock).mockClear();
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  HTMLElement.prototype.focus = originalFocus;
});

describe('sprite strip utilities', () => {
  test('imports strips with caching', () => {
    clearSpriteStripCache();
    const img1 = importSpriteStrip('foo.png');
    const img2 = importSpriteStrip('foo.png');
    expect(img1).toBe(img2);
  });

  test('preview supports keyboard navigation and export', () => {
    clearSpriteStripCache();
    const sprite = importSpriteStrip('foo.png');
    Object.defineProperties(sprite, {
      naturalWidth: { value: 30, configurable: true },
      naturalHeight: { value: 10, configurable: true },
      width: { value: 30, configurable: true },
      height: { value: 10, configurable: true },
      complete: { value: true, configurable: true },
    });

    const anchorClicks: HTMLAnchorElement[] = [];
    const anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function click(this: HTMLAnchorElement) {
        anchorClicks.push(this);
      });

    render(<SpriteStripPreview src="foo.png" frameWidth={10} frameHeight={10} frames={3} />);

    const preview = screen.getByTestId('sprite-strip-preview');
    const frameSlider = screen.getByLabelText(/Frame/, { selector: 'input' });
    const exportButton = screen.getByRole('button', { name: /export current frame/i });

    preview.focus();
    fireEvent.keyDown(preview, { key: 'ArrowRight' });

    expect(frameSlider).toHaveValue('1');
    const lastDrawCall = (mockContext.drawImage as jest.Mock).mock.calls.at(-1);
    expect(lastDrawCall?.[0]).toBe(sprite);
    expect(lastDrawCall?.[1]).toBe(10);

    fireEvent.click(exportButton);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(anchorClicks.at(-1)?.download).toBe('sprite-frame-2.png');

    anchorClickSpy.mockRestore();
  });
});
