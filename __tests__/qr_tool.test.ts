import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

import { generateDataUrl, decodeImageData } from '../components/apps/qr_tool/utils';
import QRCode from 'qrcode';

describe('QR Tool', () => {
  it('generating returns data URL', async () => {
    const url = await generateDataUrl('hello');
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('scanner decodes sample frame', () => {
    const qr = QRCode.create('sample');
    const border = 4;
    const scale = 4;
    const size = qr.modules.size;
    const width = (size + border * 2) * scale;
    const data = new Uint8ClampedArray(width * width * 4).fill(255);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const val = qr.modules.get(x, y) ? 0 : 255;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const idx =
              (((y + border) * scale + dy) * width + ((x + border) * scale + dx)) * 4;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
            data[idx + 3] = 255;
          }
        }
      }
    }
    const imageData = { data, width, height: width };
    expect(decodeImageData(imageData)).toBe('sample');
  });
});
