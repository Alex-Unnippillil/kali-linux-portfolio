const converters = {
  b64encode(input) {
    return btoa(unescape(encodeURIComponent(input)));
  },
  b64decode(input) {
    return decodeURIComponent(escape(atob(input)));
  },
  hex2b64(input) {
    if (!/^[0-9a-fA-F]+$/.test(input) || input.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }
    const bytes = input.match(/.{1,2}/g).map((b) => parseInt(b, 16));
    let bin = '';
    for (const byte of bytes) {
      bin += String.fromCharCode(byte);
    }
    return btoa(bin);
  },
  b642hex(input) {
    const bin = atob(input);
    let hex = '';
    for (let i = 0; i < bin.length; i++) {
      hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
  },
};

self.onmessage = (e) => {
  const { id, mode, input } = e.data;
  try {
    const fn = converters[mode];
    if (!fn) throw new Error('Unsupported mode');
    const result = fn(input);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: err.message || String(err) });
  }
};

export {};
