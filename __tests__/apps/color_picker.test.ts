describe('color picker swatches', () => {
  const originalClipboard = (navigator as any).clipboard;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <input type="color" id="color-input" value="#000000" />
      <span id="hex-output"></span>
      <div id="swatches"></div>
    `;

    (globalThis as any).isBrowser = true;

    (navigator as any).clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    if (originalClipboard) {
      (navigator as any).clipboard = originalClipboard;
    } else {
      delete (navigator as any).clipboard;
    }
    delete (globalThis as any).isBrowser;
  });

  it('limits swatches to 10 entries and shows feedback after copy', async () => {
    await import('../../apps/color_picker/main.js');

    const colorInput = document.getElementById('color-input');
    if (!(colorInput instanceof HTMLInputElement)) {
      throw new Error('color input missing');
    }

    const colors = [
      '#000000',
      '#111111',
      '#222222',
      '#333333',
      '#444444',
      '#555555',
      '#666666',
      '#777777',
      '#888888',
      '#999999',
      '#aaaaaa',
    ];

    colors.forEach((color) => {
      colorInput.value = color;
      colorInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const swatchButtons = swatchesAsButtons();
    expect(swatchButtons).toHaveLength(10);

    const latestColor = colors[colors.length - 1].toUpperCase();
    const expectedRgb = 'rgb(170, 170, 170)';

    expect(swatchButtons[0].getAttribute('title')).toBe(
      `${latestColor} / ${expectedRgb}`,
    );

    swatchButtons[0].click();
    await Promise.resolve();

    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(
      latestColor,
    );

    const feedback = document.getElementById('copy-feedback');
    expect(feedback?.textContent).toContain(latestColor);
    expect(feedback?.textContent).toContain(expectedRgb);

    const hexOutput = document.getElementById('hex-output');
    expect(hexOutput?.textContent).toBe(latestColor);
  });
});

function swatchesAsButtons() {
  return Array.from(document.querySelectorAll('#swatches button'));
}
