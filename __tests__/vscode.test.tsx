import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../components/apps/vscode';

describe('VsCode app', () => {
  it('renders an iframe or editor container', async () => {
    const { container } = render(<VsCode />);
    const editor = await screen.findByTestId('vscode-editor');
    const iframe = container.querySelector('iframe');
    expect(iframe || editor).toBeInTheDocument();
  });
});
