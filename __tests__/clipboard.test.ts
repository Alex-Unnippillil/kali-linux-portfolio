import { stripFormatting } from '@/src/lib/clipboard';

describe('stripFormatting', () => {
  it('removes HTML tags', () => {
    const html = '<b>Hello</b> <i>world</i>';
    expect(stripFormatting(html)).toBe('Hello world');
  });
});
