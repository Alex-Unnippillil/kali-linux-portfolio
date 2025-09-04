import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSE from '../apps/nmap-nse';

describe('NmapNSE import', () => {
  const setupFileReader = (content: string) => {
    const fileReaderMock = {
      result: content,
      onload: null as ((this: any, ev: any) => void) | null,
      readAsText: jest.fn(function (this: any) {
        this.onload?.(new Event('load'));
      }),
    } as any;
    const spy = jest
      .spyOn(window as any, 'FileReader')
      .mockImplementation(() => fileReaderMock);
    return { readAsText: fileReaderMock.readAsText, spy };
  };

  it('parses a valid XML report', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ json: () => Promise.resolve({}) } as any);

    const xml = `<?xml version="1.0"?><nmaprun><host><address addr="10.0.0.1"/><ports><port portid="80"><service name="http"/><script id="test" output="ok"/></port></ports></host></nmaprun>`;
    const { readAsText, spy } = setupFileReader(xml);

    render(<NmapNSE />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const input = screen.getByLabelText(/nmap xml file/i);
    const file = new File(['dummy'], 'scan.xml', { type: 'text/xml' });
    await userEvent.upload(input, file);
    expect(readAsText).toHaveBeenCalled();

    expect(await screen.findByText('10.0.0.1')).toBeInTheDocument();

    mockFetch.mockRestore();
    spy.mockRestore();
  });

  it('shows an error for malformed XML', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ json: () => Promise.resolve({}) } as any);

    const { readAsText, spy } = setupFileReader('<nmap');

    render(<NmapNSE />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const input = screen.getByLabelText(/nmap xml file/i);
    const badFile = new File(['bad'], 'bad.xml', { type: 'text/xml' });
    await userEvent.upload(input, badFile);
    expect(readAsText).toHaveBeenCalled();

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i);

    mockFetch.mockRestore();
    spy.mockRestore();
  });
});
