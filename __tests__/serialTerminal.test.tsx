import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import SerialTerminalApp from '../components/apps/serial-terminal';

const STORAGE_KEY = 'serial-terminal-presets';

describe('Serial terminal presets', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('saves the current configuration as a preset', () => {
    render(<SerialTerminalApp />);

    fireEvent.change(screen.getByLabelText('Baud Rate'), { target: { value: '115200' } });
    fireEvent.change(screen.getByLabelText('Data Bits'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Parity'), { target: { value: 'even' } });
    fireEvent.change(screen.getByLabelText('Stop Bits'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Flow Control'), { target: { value: 'hardware' } });
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'My Preset' } });

    fireEvent.click(screen.getByText('Save Preset'));

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string)).toEqual([
      {
        name: 'My Preset',
        config: {
          baudRate: 115200,
          dataBits: 7,
          parity: 'even',
          stopBits: 2,
          flowControl: 'hardware',
        },
      },
    ]);
  });

  test('loads presets from storage and applies the selected preset', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          name: 'Slow Device',
          config: {
            baudRate: 4800,
            dataBits: 7,
            parity: 'odd',
            stopBits: 2,
            flowControl: 'none',
          },
        },
      ]),
    );

    render(<SerialTerminalApp />);

    await waitFor(() => expect(screen.getByLabelText('Presets')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Presets'), { target: { value: 'Slow Device' } });

    expect((screen.getByLabelText('Baud Rate') as HTMLInputElement).value).toBe('4800');
    expect((screen.getByLabelText('Data Bits') as HTMLSelectElement).value).toBe('7');
    expect((screen.getByLabelText('Parity') as HTMLSelectElement).value).toBe('odd');
    expect((screen.getByLabelText('Stop Bits') as HTMLSelectElement).value).toBe('2');
    expect((screen.getByLabelText('Flow Control') as HTMLSelectElement).value).toBe('none');
  });
});
