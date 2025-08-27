import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';

describe('Metasploit app', () => {
  it('filters modules by search term', () => {
    render(<MetasploitApp />);

    const search = screen.getByPlaceholderText('Search modules');
    fireEvent.change(search, { target: { value: 'vsftpd' } });

    expect(
      screen.getByText('exploit/unix/ftp/vsftpd_234_backdoor')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('exploit/windows/smb/ms17_010_eternalblue')
    ).toBeNull();
  });

  it('shows transcript and config when module selected', () => {
    render(<MetasploitApp />);

    const item = screen.getByText(
      'exploit/windows/smb/ms17_010_eternalblue'
    );
    fireEvent.click(item);

    expect(screen.getByText(/Meterpreter session 1 opened/)).toBeInTheDocument();
    expect(screen.getByText(/set RHOSTS <target>/)).toBeInTheDocument();
  });
});

