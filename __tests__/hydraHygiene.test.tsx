import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Hygiene from '../components/apps/hydra/Hygiene';

describe('Hydra hygiene assistant', () => {
  it('flags duplicate usernames and invokes fix', () => {
    const onFix = jest.fn();
    render(
      <Hygiene
        target=" demo.local "
        rule="1:4"
        charset="abc 123"
        selectedUserList={{ name: 'users.txt', content: 'admin\nAdmin\nuser\n' }}
        selectedPassList={{ name: 'passes.txt', content: 'password\nletmein' }}
        onFix={onFix}
      />
    );

    expect(screen.getAllByTestId('hydra-hygiene-warning').length).toBeGreaterThan(0);

    const dedupeButton = screen.getByRole('button', { name: /remove duplicates/i });
    fireEvent.click(dedupeButton);

    expect(onFix).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'replace-user-list',
        payload: 'admin\nuser',
      })
    );
  });

  it('suggests redaction when inputs appear sensitive', async () => {
    const redactionSpy = jest.fn();
    render(
      <Hygiene
        target="192.168.0.10:22"
        rule="2:6"
        charset="abcd"
        selectedUserList={{ name: 'corp-users.txt', content: 'alice@example.com\nuser' }}
        selectedPassList={{ name: 'corp-pass.txt', content: 'Summer2024!' }}
        onRedactionChange={redactionSpy}
      />
    );

    await waitFor(() => {
      expect(redactionSpy).toHaveBeenCalled();
    });

    const lastCall = redactionSpy.mock.calls[redactionSpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.arrayContaining(['target', 'userList', 'passList']));
    expect(
      screen.getByText(/exported configs will replace it with <redacted>/i)
    ).toBeInTheDocument();
  });
});
