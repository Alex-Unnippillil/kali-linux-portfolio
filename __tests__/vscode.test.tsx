import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VsCode from '../components/apps/vscode';
import { ThemeProvider } from '../hooks/useTheme';

jest.mock('monaco-editor');

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ text: () => Promise.resolve('file content') })
  ) as any;
});

afterEach(() => {
  (global.fetch as jest.Mock).mockClear();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('VsCode app', () => {
  it('renders file tree from samples', () => {
    renderWithTheme(<VsCode />);
    expect(screen.getByText('hello.ts')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('opens multiple files in tabs', async () => {
    renderWithTheme(<VsCode />);
    fireEvent.click(screen.getByText('hello.ts'));
    await waitFor(() => screen.getByRole('tab', { name: 'hello.ts' }));
    fireEvent.click(screen.getByText('README.md'));
    await waitFor(() => screen.getByRole('tab', { name: 'README.md' }));
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });
});
