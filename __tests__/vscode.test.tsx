import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VsCode from '../apps/vscode';

describe('VsCode app', () => {
  it('renders file tree', () => {
    render(<VsCode />);
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('opens file in tab', () => {
    render(<VsCode />);
    fireEvent.click(screen.getByText('README.md'));
    expect(
      screen.getAllByRole('button', { name: 'README.md' }).length
    ).toBeGreaterThan(1);
  });
});
