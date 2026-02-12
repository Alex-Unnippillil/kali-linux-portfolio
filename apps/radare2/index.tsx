'use client';

import React, { useState } from 'react';
import Radare2 from '../../components/apps/radare2';
import sample from './sample.json';

const Radare2Page: React.FC = () => {
  const [data, setData] = useState(sample);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const hex = Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const disasm =
        hex.match(/.{1,2}/g)?.map((b, i) => ({
          addr: `0x${i.toString(16)}`,
          text: `db 0x${b}`,
        })) ?? [];
      if (!disasm.length) throw new Error('empty');
      setData({ file: file.name, hex, disasm, xrefs: {}, blocks: [] });
    } catch (err) {
      console.error('Parsing failed', err);
      setData(sample);
    }
  };

  return (
    <div className="h-full">
      <input
        type="file"
        onChange={onFile}
        className="mb-2"
        aria-label="binary file"
      />
      <Radare2 initialData={data} />
    </div>
  );
};

export default Radare2Page;
