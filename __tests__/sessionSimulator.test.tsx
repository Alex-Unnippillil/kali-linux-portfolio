import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionSimulator from '../components/apps/metasploit/SessionSimulator';
import type { ConsoleLogEntry } from '../components/apps/metasploit/sanitizedConsoleLogs';

describe('SessionSimulator', () => {
  const demoLogs: ConsoleLogEntry[] = [
    { timestamp: 0, line: 'msf6 > use demo/exploit' },
    { timestamp: 500, line: '[*] running payload' },
    { timestamp: 1200, line: '[+] demo session established' },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('plays sanitized logs into output history', () => {
    let history = 'banner';
    const handleOutputChange = (value: React.SetStateAction<string>) => {
      history = typeof value === 'function' ? value(history) : value;
    };

    render(<SessionSimulator logs={demoLogs} onOutputChange={handleOutputChange} />);

    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(history).toBe('banner\nmsf6 > use demo/exploit');

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(history).toBe('banner\nmsf6 > use demo/exploit\n[*] running payload');

    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(history).toBe(
      'banner\nmsf6 > use demo/exploit\n[*] running payload\n[+] demo session established',
    );
  });

  it('resumes playback using the selected speed after pausing', () => {
    let history = 'seed';
    const handleOutputChange = (value: React.SetStateAction<string>) => {
      history = typeof value === 'function' ? value(history) : value;
    };

    render(<SessionSimulator logs={demoLogs} onOutputChange={handleOutputChange} />);

    const toggle = screen.getByRole('button', { name: /play/i });
    fireEvent.click(toggle);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(history).toBe('seed\nmsf6 > use demo/exploit');

    fireEvent.change(screen.getByLabelText(/playback speed/i), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /play/i }));

    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(history).toBe('seed\nmsf6 > use demo/exploit');

    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(history).toBe('seed\nmsf6 > use demo/exploit\n[*] running payload');
  });

  it('supports scrubbing through the session history', () => {
    let history = 'root';
    const handleOutputChange = (value: React.SetStateAction<string>) => {
      history = typeof value === 'function' ? value(history) : value;
    };

    render(<SessionSimulator logs={demoLogs} onOutputChange={handleOutputChange} />);

    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    act(() => {
      jest.advanceTimersByTime(600);
    });
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    const slider = screen.getByLabelText(/session position/i);
    fireEvent.change(slider, { target: { value: '1' } });
    expect(history).toBe('root\nmsf6 > use demo/exploit');

    fireEvent.change(slider, { target: { value: '0' } });
    expect(history).toBe('root');
  });
});
