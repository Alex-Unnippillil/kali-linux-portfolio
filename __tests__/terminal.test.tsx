import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  it('runs pwd command successfully', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
    });
    expect(ref.current.getContent()).toContain('/home/alex');
  });

  it('handles invalid cd command', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('cd nowhere');
    });
    expect(ref.current.getContent()).toContain("bash: cd: nowhere: No such file or directory");
  });

  it('supports history, clear, and help commands', () => {
    const ref = createRef();
    render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp} />);
    act(() => {
      ref.current.runCommand('pwd');
      ref.current.runCommand('history');
    });
    expect(ref.current.getContent()).toContain('pwd');
    act(() => {
      ref.current.runCommand('clear');
    });
    expect(ref.current.getContent()).toContain('pwd');
    act(() => {
      ref.current.runCommand('help');
    });
    expect(ref.current.getContent()).toContain('Available commands:');
    expect(ref.current.getContent()).toContain('clear');
    expect(ref.current.getContent()).toContain('help');
  });
});
