import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';
import { jsx as _jsx } from "react/jsx-runtime";
describe('ReconNG app', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        modules: ['Port Scan']
      })
    }));
  });
  it('stores API keys in localStorage', async () => {
    render(/*#__PURE__*/_jsx(ReconNG, {}));
    await userEvent.click(screen.getByText('Settings'));
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    await userEvent.type(input, 'abc123');
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('reconng-api-keys') || '{}');
      expect(stored['DNS Enumeration']).toBe('abc123');
    });
  });
  it('loads marketplace modules', async () => {
    render(/*#__PURE__*/_jsx(ReconNG, {}));
    await userEvent.click(screen.getByText('Marketplace'));
    expect(await screen.findByText('Port Scan')).toBeInTheDocument();
  });
});
