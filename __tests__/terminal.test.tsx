import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Terminal from '../components/apps/terminal';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('Terminal component', () => {
  const addFolder = jest.fn();
  const openApp = jest.fn();

  it('runs pwd command successfully', () => {
    render(<Terminal addFolder={addFolder} openApp={openApp} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'pwd' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('/home/alex')).toBeInTheDocument();
  });

  it('handles invalid cd command', () => {
    render(<Terminal addFolder={addFolder} openApp={openApp} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'cd nowhere' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(
      screen.getByText("bash: cd: nowhere: No such file or directory")
    ).toBeInTheDocument();
  });
});
