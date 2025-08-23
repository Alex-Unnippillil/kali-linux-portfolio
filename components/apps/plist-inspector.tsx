import React, { useState } from 'react';
import plist from 'plist';
import bplist from 'bplist-parser';
import { Buffer } from "buffer";

const PlistInspector = () => {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isBinary =
        bytes.length > 6 &&
        bytes[0] === 0x62 &&
        bytes[1] === 0x70 &&
        bytes[2] === 0x6c &&
        bytes[3] === 0x69 &&
        bytes[4] === 0x73 &&
        bytes[5] === 0x74; // "bplist"

      let obj: unknown;
      if (isBinary) {
        // parseBuffer returns an array of root objects
        const parsed = bplist.parseBuffer(Buffer.from(bytes));
        obj = parsed.length === 1 ? parsed[0] : parsed;
      } else {
        const text = new TextDecoder().decode(bytes);
        obj = plist.parse(text);
      }
      setJson(JSON.stringify(obj, null, 2));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse plist');
      setJson('');
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <input
        type="file"
        accept=".plist"
        onChange={handleFile}
        className="mb-4"
      />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <pre className="flex-1 overflow-auto bg-gray-800 p-2 rounded whitespace-pre-wrap">
        {json}
      </pre>
    </div>
  );
};

export default PlistInspector;

export const displayPlistInspector = () => <PlistInspector />;

