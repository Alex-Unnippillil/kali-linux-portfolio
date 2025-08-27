import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { generateDataUrl, wifiPreset, urlPreset, vcardPreset, smsPreset, emailPreset } from '../components/apps/qr_tool/utils';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const frameFor = (text) => {
  const qr = QRCode.create(text);
  const margin = 4;
  const scale = 8;
  const moduleCount = qr.modules.size + margin * 2;
  const size = moduleCount * scale;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      let isDark = false;
      if (r >= margin && c >= margin && r < qr.modules.size + margin && c < qr.modules.size + margin) {
        isDark = qr.modules.get(c - margin, r - margin);
      }
      const color = isDark ? 0 : 255;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const idx = ((r * scale + y) * size + (c * scale + x)) * 4;
          data[idx] = data[idx + 1] = data[idx + 2] = color;
          data[idx + 3] = 255;
        }
      }
    }
  }
  return { data, width: size, height: size };
};

test('generateDataUrl produces data URL', async () => {
  const url = await generateDataUrl('hello');
  expect(url.startsWith('data:image/png')).toBe(true);
});

test('scanner returns payload for sample frame', () => {
  const { data, width, height } = frameFor('sample');
  const result = jsQR(data, width, height);
  expect(result.data).toBe('sample');
});

test('presets produce valid codes', () => {
  const texts = [
    wifiPreset({ ssid: 'MyWiFi', password: 'pass', security: 'WPA' }),
    urlPreset('https://example.com'),
    vcardPreset({ name: 'John Doe', email: 'john@example.com' }),
    smsPreset({ number: '12345', message: 'hi' }),
    emailPreset({ address: 'a@b.com', subject: 'Hi', body: 'Test' }),
  ];
  for (const t of texts) {
    const { data, width, height } = frameFor(t);
    const res = jsQR(data, width, height);
    expect(res.data).toBe(t);
  }
});
