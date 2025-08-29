import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

describe('VsCode app', () => {
  it('renders editor container', async () => {
    render(<VsCode />);
    expect(await screen.findByTestId('vscode-editor')).toBeInTheDocument();
  });
});
