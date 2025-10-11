import React from 'react';
import CoreRadare2 from './radare2/index.js';
import dataset from '../../apps/radare2/fixtures.json';

const fallbackFixture = {
  id: 'demo-stub',
  title: 'Demo stub',
  description: 'Minimal return 0 stub used as a fallback when fixture data is unavailable.',
  file: 'demo.bin',
  format: 'ELF64',
  arch: 'x86-64',
  os: 'Linux',
  hex: '554889e5b8000000005dc3',
  disasm: [
    { addr: '0x1000', text: 'push rbp' },
    { addr: '0x1001', text: 'mov rbp, rsp' },
    { addr: '0x1004', text: 'mov eax, 0' },
    { addr: '0x1009', text: 'pop rbp' },
    { addr: '0x100a', text: 'ret' },
  ],
  xrefs: {
    '0x1004': ['0x1009'],
  },
  blocks: [
    { addr: '0x1000', edges: ['0x1004'] },
    { addr: '0x1004', edges: ['0x1009'] },
    { addr: '0x1009', edges: [] },
  ],
};

const datasetPayload =
  dataset?.fixtures?.length
    ? dataset
    : { defaultFixtureId: fallbackFixture.id, fixtures: [fallbackFixture] };

const Radare2 = ({ initialData = datasetPayload }) => (
  <CoreRadare2 initialData={initialData} />
);

export default Radare2;
