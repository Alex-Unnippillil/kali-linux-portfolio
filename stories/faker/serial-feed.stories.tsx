import React from 'react';
import {
  DEFAULT_SERIAL_SEED,
  formatSerialFrame,
  generateSerialFrames,
} from '@/utils/faker/serial';

const frames = generateSerialFrames({ seed: DEFAULT_SERIAL_SEED });
const lines = frames.map((frame) => formatSerialFrame(frame)).join('\n');

const meta = {
  title: 'Faker/Serial/Frames',
};

export default meta;

export const Default = () => (
  <pre
    style={{
      background: '#000',
      color: '#5efc82',
      padding: '1rem',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
    }}
  >
    {lines}
  </pre>
);
