import React, { useEffect, useState } from 'react';
import { bech32 } from 'bech32';
import bs58 from 'bs58';
import ascii85 from 'ascii85';

const codecs = {
  bech32: {
    encode: (text: string) => {
      const words = bech32.toWords(Buffer.from(text, 'utf8'));
      return bech32.encode('text', words);
    },
    decode: (data: string) => {
      const { words } = bech32.decode(data);
      const bytes = bech32.fromWords(words);
      return Buffer.from(bytes).toString('utf8');
    },
  },
  bs58: {
    encode: (text: string) => bs58.encode(Buffer.from(text, 'utf8')),
    decode: (data: string) => Buffer.from(bs58.decode(data)).toString('utf8'),
  },
  ascii85: {
    encode: (text: string) => ascii85.encode(Buffer.from(text, 'utf8')).toString(),
    decode: (data: string) => ascii85.decode(data).toString(),
  },
} as const;

type Codec = keyof typeof codecs;
type Mode = 'encode' | 'decode';

const BaseEncoders = () => {
  const [codec, setCodec] = useState<Codec>('bech32');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setOutput('');
      setError('');
      return;
    }
    try {
      const result = codecs[codec][mode](input);
      setOutput(result);
      setError('');
    } catch (e: any) {
      setOutput('');
      setError(e.message || 'Conversion failed');
    }
  }, [input, codec, mode]);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 flex flex-wrap gap-2">
        <select
          className="px-2 py-1 rounded text-black"
          value={codec}
          onChange={(e) => setCodec(e.target.value as Codec)}
        >
          <option value="bech32">Bech32</option>
          <option value="bs58">Base58</option>
          <option value="ascii85">Ascii85</option>
        </select>
        <select
          className="px-2 py-1 rounded text-black"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="encode">Encode</option>
          <option value="decode">Decode</option>
        </select>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Input"
        className="w-full h-32 p-2 mb-2 rounded text-black"
      />
      <textarea
        value={output}
        readOnly
        placeholder="Output"
        className="w-full h-32 p-2 rounded text-black"
      />
    </div>
  );
};

export default BaseEncoders;
export const displayBaseEncoders = () => <BaseEncoders />;
