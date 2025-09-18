import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../components/apps/metasploit', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/apps/metasploit/modules.json', () => ({
  __esModule: true,
  default: [
    {
      name: 'auxiliary/admin/2wire/xslt_password_reset',
      description: 'Reset the admin password on a mocked 2Wire router.',
      severity: 'low',
      type: 'auxiliary',
      tags: ['admin', '2wire', 'xslt-password-reset'],
    },
    {
      name: 'exploit/windows/smb/ms17_010_eternalblue',
      description: 'Mocked SMB remote exploit.',
      severity: 'critical',
      type: 'exploit',
      tags: ['windows', 'smb'],
    },
  ],
}));

import MetasploitPage from '../apps/metasploit';

describe('Metasploit page module filtering', () => {
  it('filters modules by search and shows tags', () => {
    render(<MetasploitPage />);

    // expand tree to reveal a known module
    fireEvent.click(screen.getAllByText('auxiliary')[0]);
    fireEvent.click(screen.getAllByText('admin')[0]);
    fireEvent.click(screen.getAllByText('2wire')[0]);
    expect(screen.getByText('xslt_password_reset')).toBeInTheDocument();

    // search hides the module
    fireEvent.change(screen.getAllByPlaceholderText('Search modules')[0], {
      target: { value: 'nonexistent-module' },
    });
    expect(screen.queryByText('xslt_password_reset')).toBeNull();

    // tag buttons are rendered
    expect(screen.getByRole('button', { name: 'admin' })).toBeInTheDocument();
  });
});

describe('Metasploit payload builder form', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).clipboard;
  });

  it('enforces payload option validation and shows error messages', () => {
    render(<MetasploitPage />);

    const generateButton = screen.getByRole('button', { name: /generate json/i });
    fireEvent.click(generateButton);

    expect(screen.getAllByText('LHOST is required.')[0]).toBeInTheDocument();

    const lhostInput = screen.getByLabelText('LHOST');
    fireEvent.change(lhostInput, { target: { value: '999.999.999.999' } });
    fireEvent.click(generateButton);

    expect(
      screen.getAllByText('LHOST must be a valid IPv4 address.')[0],
    ).toBeInTheDocument();
    expect(screen.queryByTestId('payload-preview')).toBeNull();
  });

  it('generates payload preview and copies to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<MetasploitPage />);

    const lhostInput = screen.getByLabelText('LHOST');
    fireEvent.change(lhostInput, { target: { value: '192.168.0.2' } });

    const generateButton = screen.getByRole('button', { name: /generate json/i });
    fireEvent.click(generateButton);

    const previewElement = await screen.findByTestId('payload-preview');
    const previewText = previewElement.textContent ?? '';

    expect(previewText).toContain('"payload": "windows/meterpreter/reverse_tcp"');
    expect(previewText).toContain('"LHOST": "192.168.0.2"');
    expect(previewText).toContain('"LPORT": 4444');

    const copyButton = screen.getByRole('button', { name: /copy json/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(previewText);
    });
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
