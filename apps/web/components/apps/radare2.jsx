import React from 'react';
import CoreRadare2 from './radare2/index.js';

// Precomputed disassembly for a tiny demo binary. This avoids requiring the full
// radare2 toolchain by bundling hex dump, disassembly, cross-references and
// basic block graph in JSON form.
const demo = {
  file: 'demo.bin',
  hex: '554889e5b8000000005dc3',
  disasm: [
    { addr: '0x1000', text: 'push rbp' },
    { addr: '0x1001', text: 'mov rbp, rsp' },
    { addr: '0x1004', text: 'mov eax, 0' },
    { addr: '0x1009', text: 'pop rbp' },
    { addr: '0x100a', text: 'ret' }
  ],
  xrefs: {
    '0x1004': ['0x1009']
  },
  blocks: [
    { addr: '0x1000', edges: ['0x1004'] },
    { addr: '0x1004', edges: ['0x1009'] },
    { addr: '0x1009', edges: [] }
  ]
};

const Radare2 = ({ initialData = demo }) => <CoreRadare2 initialData={initialData} />;

export default Radare2;
