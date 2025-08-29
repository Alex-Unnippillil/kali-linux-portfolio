import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../apps/vscode';

jest.mock('@monaco-editor/react', () => function MonacoMock() { return <div data-testid="editor" />; });

describe('VsCode app', () => {
  it('renders open button', () => {
    render(<VsCode />);
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
  });
});
