import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CredHygiene from '../components/apps/hydra/CredHygiene';

describe('CredHygiene warnings', () => {
  it('highlights duplicates and weak credentials', () => {
    render(
      <CredHygiene
        target="10.0.0.1"
        service="ssh"
        userList={{ name: 'users.txt', content: 'admin\nadmin\n' }}
        passList={{ name: 'passwords.txt', content: 'password\n123456\n' }}
        attempts={[]}
      />
    );

    expect(
      screen.getByText(/Duplicate user entries detected/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Weak passwords flagged/i)).toBeInTheDocument();
  });
});

describe('CredHygiene export redaction', () => {
  it('redacts sensitive values by default and allows reveal', () => {
    const handleExport = jest.fn();

    render(
      <CredHygiene
        target="10.0.0.1"
        service="ssh"
        userList={{ name: 'users.txt', content: 'alice\n' }}
        passList={{ name: 'passwords.txt', content: 'hunter2\n' }}
        attempts={[{ user: 'alice', password: 'hunter2', result: 'attempt' }]}
        onExport={handleExport}
      />
    );

    fireEvent.click(screen.getByText(/Copy session export/i));
    expect(handleExport).toHaveBeenCalled();
    const firstCall = handleExport.mock.calls[0][0];
    expect(firstCall.redacted).toBe(true);
    expect(firstCall.payload).toContain('[redacted password]');
    expect(firstCall.payload).toContain('[redacted host]');

    fireEvent.click(screen.getByLabelText(/Reveal credentials/i));
    fireEvent.click(screen.getByText(/Copy session export/i));
    const secondCall = handleExport.mock.calls[1][0];
    expect(secondCall.redacted).toBe(false);
    expect(secondCall.payload).toContain('hunter2');
    expect(secondCall.payload).toContain('10.0.0.1');
  });
});
