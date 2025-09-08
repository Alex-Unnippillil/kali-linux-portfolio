import { extractAccentColors } from '../lib/wallpaper-accent';

describe('extractAccentColors', () => {
  it('returns dominant colors from image data', () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255, // red
      0, 255, 0, 255, // green
      0, 0, 255, 255, // blue
    ]);

    const getContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({ data: pixels } as ImageData)),
      }) as any);

    const img = new Image();
    img.width = 3;
    img.height = 1;

    const colors = extractAccentColors(img, 3);
    expect(colors).toEqual(
      expect.arrayContaining(['#ff0000', '#00ff00', '#0000ff']),
    );
    getContextSpy.mockRestore();
  });
});
