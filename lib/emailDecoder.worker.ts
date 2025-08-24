const ctx: Worker = self as any;

interface DecodeRequest {
  id: string;
  data: string;
  encoding: string;
}

interface DecodeResponse {
  id: string;
  decoded?: ArrayBuffer;
  error?: string;
}

function decodeBase64(data: string): Uint8Array {
  const clean = data.replace(/\s+/g, '');
  if (clean.length % 4 !== 0) {
    throw new Error('Invalid base64 length');
  }
  let binary = '';
  try {
    binary = atob(clean);
  } catch (e) {
    throw new Error('Invalid base64 data');
  }
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeQuotedPrintable(input: string): Uint8Array {
  const str = input.replace(/=\r?\n/g, '');
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '=') {
      if (i + 2 >= str.length) {
        throw new Error('Truncated quoted-printable escape');
      }
      const hex = str.slice(i + 1, i + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
        throw new Error(`Invalid quoted-printable escape '='${hex}`);
      }
      out.push(parseInt(hex, 16));
      i += 2;
    } else {
      out.push(ch.charCodeAt(0));
    }
  }
  return new Uint8Array(out);
}

ctx.onmessage = (e: MessageEvent<DecodeRequest>) => {
  const { id, data, encoding } = e.data;
  try {
    let bytes: Uint8Array;
    if (encoding === 'base64') {
      bytes = decodeBase64(data);
    } else if (encoding === 'quoted-printable') {
      bytes = decodeQuotedPrintable(data);
    } else {
      bytes = new TextEncoder().encode(data);
    }
    const buffer = bytes.buffer;
    const response: DecodeResponse = { id, decoded: buffer };
    ctx.postMessage(response, [buffer]);
  } catch (err: any) {
    ctx.postMessage({ id, error: err.message || String(err) });
  }
};

export {};
