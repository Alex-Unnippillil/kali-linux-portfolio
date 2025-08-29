import React from 'react';
import { render, screen } from '@testing-library/react';
import VsCode from '../apps/vscode';

jest.mock('../apps/vscode/extensions/recommend', () => ({
  scanProjectType: jest.fn().mockResolvedValue('node'),
  getRecommendations: () => [{ id: 'dbaeumer.vscode-eslint', name: 'ESLint' }],
}));

describe('VsCode app', () => {
  it('shows recommended extensions in marketplace', async () => {
    render(<VsCode />);
    const ext = await screen.findByText('ESLint');
    expect(ext).toBeInTheDocument();
    expect(ext.tagName).toBe('A');
  });
});
