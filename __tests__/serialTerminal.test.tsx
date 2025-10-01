import React from 'react';
import { render, screen } from '@testing-library/react';
import SerialTerminalApp from '../components/apps/serial-terminal';
import {
  DEFAULT_SERIAL_SEED,
  generateSerialFrames,
} from '../utils/faker/serial';

describe('SerialTerminalApp', () => {
  it('renders seeded demo frames when Web Serial API is unavailable', () => {
    const frames = generateSerialFrames({ seed: DEFAULT_SERIAL_SEED });
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const asciiPattern = new RegExp(escape(frames[0].ascii));
    render(<SerialTerminalApp />);

    expect(
      screen.getByText(asciiPattern)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Web Serial API not supported/i)
    ).toBeInTheDocument();
  });
});
