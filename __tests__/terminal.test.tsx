import React, { createRef, act } from 'react';
import { render, screen } from '@testing-library/react';
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
});
