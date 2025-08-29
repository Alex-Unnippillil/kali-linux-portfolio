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
      onPaste: jest.fn(),
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

import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../../apps/terminal';

describe('terminal filesystem commands', () => {
  it('creates, reads, and removes files persistently', async () => {
    const ref = createRef<any>();
    const { unmount } = render(<Terminal ref={ref} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('touch test.txt');
    });
    await act(async () => {
      await ref.current.runCommand('echo hello > test.txt');
    });
    await act(async () => {
      await ref.current.runCommand('ls');
    });
    expect(ref.current.getContent()).toContain('test.txt');
    await act(async () => {
      await ref.current.runCommand('cat test.txt');
    });
    expect(ref.current.getContent()).toContain('hello');
    unmount();
    const ref2 = createRef<any>();
    render(<Terminal ref={ref2} />);
    await act(async () => {});
    await act(async () => {
      await ref2.current.runCommand('ls');
    });
    expect(ref2.current.getContent()).toContain('test.txt');
    await act(async () => {
      await ref2.current.runCommand('rm test.txt');
    });
    await act(async () => {
      await ref2.current.runCommand('clear');
    });
    await act(async () => {
      await ref2.current.runCommand('ls');
    });
    expect(ref2.current.getContent()).not.toContain('test.txt');
  });

  it('supports directories and cd', async () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} />);
    await act(async () => {});
    await act(async () => {
      await ref.current.runCommand('mkdir dir');
    });
    await act(async () => {
      await ref.current.runCommand('cd dir');
    });
    await act(async () => {
      await ref.current.runCommand('touch inner.txt');
    });
    await act(async () => {
      await ref.current.runCommand('cd ..');
    });
    await act(async () => {
      await ref.current.runCommand('ls dir');
    });
    expect(ref.current.getContent()).toContain('inner.txt');
  });
});

