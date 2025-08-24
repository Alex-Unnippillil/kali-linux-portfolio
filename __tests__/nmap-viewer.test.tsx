import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import NmapViewer from '@components/apps/nmap-viewer';
import fs from 'fs';
import path from 'path';

jest.mock('xmllint-wasm', () => ({ validateXML: jest.fn() }));
const { validateXML } = jest.requireMock('xmllint-wasm');

describe('NmapViewer', () => {
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'nmap-sample.xml'), 'utf8');

  beforeEach(() => {
    (validateXML as jest.Mock).mockReset();
    (global as any).fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve('dtd') });
  });

  it('parses hosts and ports from XML', async () => {
    (validateXML as jest.Mock).mockResolvedValue({ valid: true, errors: [] });
    render(<NmapViewer />);
    const file = { text: () => Promise.resolve(fixture) } as any;
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('80');
    expect(screen.getByText('CVE-2017-5638')).toBeInTheDocument();
  });

  it('shows error on invalid XML', async () => {
    (validateXML as jest.Mock).mockResolvedValue({ valid: false, errors: ['bad xml'] });
    render(<NmapViewer />);
    const file = { text: () => Promise.resolve('<bad></bad>') } as any;
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('bad xml');
  });

});
