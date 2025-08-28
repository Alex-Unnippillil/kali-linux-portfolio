import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

jest.mock('@monaco-editor/react');

describe('VsCode app', () => {
  it('renders file tree and opens tab', () => {
    render(<VsCode />);
    fireEvent.click(screen.getByText('README.md'));
    const tab = screen.getAllByText('README.md')[0];
    expect(tab).toBeInTheDocument();
  });

  it('marks tab dirty after edit', () => {
    render(<VsCode />);
    fireEvent.click(screen.getByText('README.md'));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'changed' } });
    const tab = screen.getByText(/^README\.md\*$/);
    expect(tab).toBeInTheDocument();
  });

  it('opens action palette with Ctrl+K', () => {
    render(<VsCode />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByText(/Action Palette/)).toBeInTheDocument();
  });

  it('persists theme selection', () => {
    render(<VsCode />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } });
    expect(window.localStorage.getItem('vscode-theme')).toBe('light');
  });
});
