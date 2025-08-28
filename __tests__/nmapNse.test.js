import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';
import { jsx as _jsx } from "react/jsx-runtime";
describe('NmapNSEApp', () => {
  it('shows example output for selected script', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({
      json: () => Promise.resolve({
        'ftp-anon': 'FTP output'
      })
    }));
    render(/*#__PURE__*/_jsx(NmapNSEApp, {}));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await userEvent.selectOptions(screen.getByLabelText('Script'), 'ftp-anon');
    expect(await screen.findByText('FTP output')).toBeInTheDocument();
    mockFetch.mockRestore();
  });
  it('copies command to clipboard', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({
      json: () => Promise.resolve({})
    }));
    const writeText = jest.fn();
    navigator.clipboard = {
      writeText
    };
    render(/*#__PURE__*/_jsx(NmapNSEApp, {}));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', {
      name: /copy/i
    }));
    expect(writeText).toHaveBeenCalled();
    mockFetch.mockRestore();
  });
});
