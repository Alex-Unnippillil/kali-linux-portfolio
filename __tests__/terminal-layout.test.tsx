jest.mock(
  '@xterm/xterm',
  () => ({
    Terminal: jest.fn().mockImplementation(() => ({
      open: jest.fn(),
      focus: jest.fn(),
      loadAddon: jest.fn(),
      write: jest.fn(),
      writeln: jest.fn(),
      onData: jest.fn(),
      onKey: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
    })),
  }),
  { virtual: true },
);
jest.mock(
  '@xterm/addon-fit',
  () => ({
    FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
  }),
  { virtual: true },
);
jest.mock(
  '@xterm/addon-search',
  () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({ findNext: jest.fn() })),
  }),
  { virtual: true },
);
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });

import React, { act } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import TerminalTabs from '../apps/terminal/tabs';
import { listSessions, resetSessions } from '../apps/terminal/state';

const createDataTransfer = () => {
  const data: Record<string, string> = {};
  return {
    data,
    setData: (type: string, value: string) => {
      data[type] = value;
    },
    getData: (type: string) => data[type],
    clearData: () => {
      Object.keys(data).forEach((key) => delete data[key]);
    },
    dropEffect: 'move',
    effectAllowed: 'all',
  } as unknown as DataTransfer;
};

describe('Terminal layout interactions', () => {
  beforeEach(() => {
    resetSessions();
  });

  it('creates split windows and sessions', async () => {
    render(<TerminalTabs openApp={jest.fn()} />);
    await act(async () => {});
    expect(listSessions().length).toBe(1);

    const splitButton = screen.getByLabelText('Add split to the right');
    fireEvent.click(splitButton);
    await act(async () => {});

    expect(screen.getAllByTestId(/terminal-window-/)).toHaveLength(2);
    expect(listSessions().length).toBe(2);
  });

  it('detaches tabs without losing session state', async () => {
    render(<TerminalTabs openApp={jest.fn()} />);
    await act(async () => {});
    const [session] = listSessions();
    expect(session).toBeDefined();

    await act(async () => {
      await session?.runCommand?.('help');
    });

    const tabHeader = document.querySelector('.flex.items-center.cursor-pointer') as HTMLElement;
    expect(tabHeader).toBeTruthy();
    const detachZone = screen.getByLabelText('Detach Tab');
    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(tabHeader, { dataTransfer });
    fireEvent.dragOver(detachZone, { dataTransfer });
    fireEvent.drop(detachZone, { dataTransfer });
    await act(async () => {});

    expect(screen.getAllByTestId(/terminal-window-/)).toHaveLength(2);
    expect(session?.historyRef.current).toContain('help');
  });
});
