import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MimikatzOffline, { parseDump } from '../components/apps/mimikatz/offline';

describe('parseDump', () => {
  it('extracts username and password pairs', () => {
    const content = [
      '[*] sekurlsa::logonpasswords',
      'username : LAB\\analyst',
      'password : example-password',
      '',
      'user = demo\\ops',
      'password = Another-Pass',
    ].join('\n');

    expect(parseDump(content)).toEqual([
      { user: 'LAB\\analyst', password: 'example-password' },
      { user: 'demo\\ops', password: 'Another-Pass' },
    ]);
  });
});

describe('MimikatzOffline component', () => {
  it('renders lab safety messaging', () => {
    render(<MimikatzOffline />);
    expect(
      screen.getByText(/Offline simulator. Sanitized datasets only./i)
    ).toBeInTheDocument();
  });

  it('loads packaged dataset and exposes investigation flow', async () => {
    const user = userEvent.setup();
    render(<MimikatzOffline />);

    await user.click(
      screen.getByRole('button', { name: /Load Training Workstation Snapshot/i })
    );

    expect(await screen.findByTestId('credential-user-0')).toHaveTextContent(
      /LAB\\\\analyst/
    );
    expect(screen.getByRole('heading', { name: /Investigation flow/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Review the briefing to confirm sanitized dataset use/i)
    ).toBeInTheDocument();
  });
});
