import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

jest.mock('@monaco-editor/react', () => {
  const Mock = () => <div data-testid="editor" />;
  Mock.displayName = 'MockMonacoEditor';
  return Mock;
});

describe('VsCode app', () => {
  it('renders editor and language selector', async () => {
    render(<VsCode />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(await screen.findByTestId('editor')).toBeInTheDocument();
  });
});
