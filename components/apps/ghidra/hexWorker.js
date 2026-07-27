/* eslint-env worker */
self.onmessage = (e) => {
  const { id, code, bytes, address } = e.data;
  let formatted = '';

  if (Array.isArray(bytes) && bytes.length > 0) {
    const byteValues = bytes.map((b) => {
      if (typeof b === 'number') return b.toString(16).padStart(2, '0');
      const parsed = parseInt(b, 16);
      if (Number.isNaN(parsed)) return '00';
      return parsed.toString(16).padStart(2, '0');
    });
    const base = typeof address === 'string' ? parseInt(address, 16) : Number(address);
    const hasBase = !Number.isNaN(base);
    const lines = [];
    for (let i = 0; i < byteValues.length; i += 16) {
      const chunk = byteValues.slice(i, i + 16);
      const prefix = hasBase
        ? `${(base + i).toString(16).padStart(8, '0')}: `
        : '';
      lines.push(`${prefix}${chunk.join(' ')}`);
    }
    formatted = lines.join('\n');
  } else if (typeof code === 'string') {
    const encoder = new TextEncoder();
    const hex = Array.from(encoder.encode(code))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    formatted = hex;
  }

  postMessage({ id, hex: formatted });
};
