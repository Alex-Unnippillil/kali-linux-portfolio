import plist from 'plist';
import { UID } from 'bplist-parser';
import { Buffer } from 'buffer';

const detectFormat = (bytes: Uint8Array): string => {
  if (
    bytes.length > 6 &&
    bytes[0] === 0x62 &&
    bytes[1] === 0x70 &&
    bytes[2] === 0x6c &&
    bytes[3] === 0x69 &&
    bytes[4] === 0x73 &&
    bytes[5] === 0x74
  ) {
    return 'binary';
  }
  const text = new TextDecoder().decode(bytes.slice(0, 100)).trim();
  if (text.startsWith('<?xml')) return 'xml';
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  return 'unknown';
};

self.onmessage = (e: MessageEvent) => {
  const bytes = new Uint8Array(e.data.buffer);
  const format = detectFormat(bytes);
  try {
    let obj: any;
    let offsets: Record<string, number> = {};
    if (format === 'binary') {
      const parsed = parseBinaryWithOffsets(Buffer.from(bytes));
      obj = parsed.root;
      offsets = parsed.offsets;
    } else if (format === 'xml') {
      const text = new TextDecoder().decode(bytes);
      obj = plist.parse(text);
    } else if (format === 'json') {
      const text = new TextDecoder().decode(bytes);
      obj = JSON.parse(text);
    } else {
      throw new Error('Unknown plist format');
    }
    (self as any).postMessage({
      type: 'result',
      root: obj,
      format,
      offsets,
    });
  } catch (err: any) {
    const corruption =
      format === 'binary'
        ? Buffer.from(bytes.slice(-32)).toString('hex')
        : null;
    (self as any).postMessage({
      type: 'error',
      error: err.message || String(err),
      corruption,
      format,
    });
  }
};

const EPOCH = 978307200000;

const parseBinaryWithOffsets = (buffer: Buffer) => {
  const header = buffer.slice(0, 6).toString('utf8');
  if (header !== 'bplist') {
    throw new Error("Invalid binary plist. Expected 'bplist' at offset 0.");
  }
  const trailer = buffer.slice(buffer.length - 32);
  const offsetSize = trailer.readUInt8(6);
  const objectRefSize = trailer.readUInt8(7);
  const numObjects = readUInt64BE(trailer, 8);
  const topObject = readUInt64BE(trailer, 16);
  const offsetTableOffset = readUInt64BE(trailer, 24);

  const offsetTable: number[] = [];
  for (let i = 0; i < numObjects; i++) {
    const offsetBytes = buffer.slice(
      offsetTableOffset + i * offsetSize,
      offsetTableOffset + (i + 1) * offsetSize,
    );
    offsetTable[i] = readUInt(offsetBytes, 0);
  }

  const offsets: Record<string, number> = {};

  const parseObject = (objRef: number, path: string, record = true): any => {
    const offset = offsetTable[objRef];
    if (record) offsets[path] = offset;
    const type = buffer[offset];
    const objType = (type & 0xf0) >> 4;
    const objInfo = type & 0x0f;
    switch (objType) {
      case 0x0:
        return parseSimple(objInfo);
      case 0x1:
        return parseInteger(objInfo, offset);
      case 0x8:
        return parseUID(objInfo, offset);
      case 0x2:
        return parseReal(objInfo, offset);
      case 0x3:
        return parseDate(objInfo, offset);
      case 0x4:
        return parseData(objInfo, offset);
      case 0x5:
        return parseAscii(objInfo, offset);
      case 0x6:
        return parseUtf16(objInfo, offset);
      case 0xa:
        return parseArray(objInfo, offset, path);
      case 0xd:
        return parseDict(objInfo, offset, path);
      default:
        throw new Error('Unhandled type 0x' + objType.toString(16));
    }
  };

  const parseLength = (offset: number, objInfo: number) => {
    let length = objInfo;
    let newOffset = offset + 1;
    if (objInfo === 0xf) {
      const intType = buffer[newOffset];
      const intInfo = intType & 0x0f;
      const intLength = Math.pow(2, intInfo);
      newOffset += 1;
      length = readUInt(buffer.slice(newOffset, newOffset + intLength));
      newOffset += intLength;
    }
    return { length, offset: newOffset };
  };

  const parseSimple = (objInfo: number) => {
    switch (objInfo) {
      case 0x0:
        return null;
      case 0x8:
        return false;
      case 0x9:
        return true;
      case 0xf:
        return null;
      default:
        throw new Error('Unhandled simple type 0x' + objInfo.toString(16));
    }
  };

  const parseInteger = (objInfo: number, offset: number) => {
    const length = Math.pow(2, objInfo);
    const data = buffer.slice(offset + 1, offset + 1 + length);
    let value = 0n;
    for (const byte of data) {
      value = (value << 8n) | BigInt(byte);
    }
    return length <= 6 ? Number(value) : value;
  };

  const parseUID = (objInfo: number, offset: number) => {
    const length = objInfo + 1;
    const data = buffer.slice(offset + 1, offset + 1 + length);
    const value = readUInt(data, 0);
    return new UID(value);
  };

  const parseReal = (objInfo: number, offset: number) => {
    const length = Math.pow(2, objInfo);
    const realBuffer = buffer.slice(offset + 1, offset + 1 + length);
    if (length === 4) return realBuffer.readFloatBE(0);
    if (length === 8) return realBuffer.readDoubleBE(0);
    throw new Error('Unhandled float size ' + length);
  };

  const parseDate = (objInfo: number, offset: number) => {
    if (objInfo !== 0x3) {
      // fallthrough
    }
    const dateBuffer = buffer.slice(offset + 1, offset + 9);
    const seconds = dateBuffer.readDoubleBE(0);
    return new Date(EPOCH + seconds * 1000);
  };

  const parseData = (objInfo: number, offset: number) => {
    const { length, offset: dataOffset } = parseLength(offset, objInfo);
    return buffer.slice(dataOffset, dataOffset + length);
  };

  const parseAscii = (objInfo: number, offset: number) => {
    const { length, offset: strOffset } = parseLength(offset, objInfo);
    return buffer.slice(strOffset, strOffset + length).toString('utf8');
  };

  const parseUtf16 = (objInfo: number, offset: number) => {
    const { length, offset: strOffset } = parseLength(offset, objInfo);
    const byteLength = length * 2;
    let plistString = Buffer.from(
      buffer.slice(strOffset, strOffset + byteLength),
    );
    plistString = swapBytes(plistString);
    return plistString.toString('ucs2');
  };

  const parseArray = (objInfo: number, offset: number, path: string) => {
    const { length, offset: arrayOffset } = parseLength(offset, objInfo);
    const arr: any[] = [];
    for (let i = 0; i < length; i++) {
      const objRef = readUInt(
        buffer.slice(
          arrayOffset + i * objectRefSize,
          arrayOffset + (i + 1) * objectRefSize,
        ),
      );
      arr[i] = parseObject(objRef, `${path}[${i}]`);
    }
    return arr;
  };

  const parseDict = (objInfo: number, offset: number, path: string) => {
    const { length, offset: dictOffset } = parseLength(offset, objInfo);
    const dict: Record<string, any> = {};
    for (let i = 0; i < length; i++) {
      const keyRef = readUInt(
        buffer.slice(
          dictOffset + i * objectRefSize,
          dictOffset + (i + 1) * objectRefSize,
        ),
      );
      const valRef = readUInt(
        buffer.slice(
          dictOffset + length * objectRefSize + i * objectRefSize,
          dictOffset + length * objectRefSize + (i + 1) * objectRefSize,
        ),
      );
      const key = parseObject(keyRef, '', false);
      const childPath = path === '$' ? `$.${key}` : `${path}.${key}`;
      dict[key] = parseObject(valRef, childPath);
    }
    return dict;
  };

  const root = parseObject(topObject, '$');
  return { root, offsets };
};

const readUInt = (buffer: Buffer, start: number) => {
  let l = 0;
  for (let i = start; i < buffer.length; i++) {
    l <<= 8;
    l |= buffer[i] & 0xff;
  }
  return l;
};

const readUInt64BE = (buffer: Buffer, start: number) => {
  const data = buffer.slice(start, start + 8);
  return data.readUInt32BE(4);
};

const swapBytes = (buffer: Buffer) => {
  const len = buffer.length;
  for (let i = 0; i < len; i += 2) {
    const a = buffer[i];
    buffer[i] = buffer[i + 1];
    buffer[i + 1] = a;
  }
  return buffer;
};
