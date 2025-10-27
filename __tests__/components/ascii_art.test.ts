import { convertImageDataToAscii, renderTextToAscii } from '../../components/apps/ascii_art/asciiUtils';

describe('ascii art utilities', () => {
  it('converts image data to ASCII respecting brightness', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const result = convertImageDataToAscii(
      { data, width: 2, height: 2 },
      {
        charSet: '@.',
        density: 2,
        contrast: 1,
        brightness: 0,
        useColor: false,
        palette: undefined,
      },
    );
    expect(result.plain).toBe('..\n@@\n');
    expect(result.ansi).toBe('..\u001b[0m\n@@\u001b[0m\n');
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('renders text input to ASCII characters using figlet baseline', async () => {
    const output = await renderTextToAscii('Hi', {
      charSet: '@.',
      density: 2,
      contrast: 1,
      brightness: 0,
      useColor: false,
      palette: undefined,
      scale: 1,
    });
    expect(output.plain).toContain('@');
    expect(output.plain.split('\n').length).toBeGreaterThan(1);
    expect(output.width).toBeGreaterThan(0);
    expect(output.height).toBeGreaterThan(0);
  });
});
