import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../apps/vscode';

describe('VsCode app', () => {
  it('renders editor and folder button', () => {
    render(<VsCode />);
    expect(
      screen.getByRole('button', { name: /open folder/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('monaco-container')).toBeInTheDocument();
  });
});

