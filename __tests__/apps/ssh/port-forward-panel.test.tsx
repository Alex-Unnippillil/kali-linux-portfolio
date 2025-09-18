import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PortForwardPanel from '@/apps/ssh/components/PortForwardPanel';
import { __testing as profileTesting } from '@/apps/ssh/state/profiles';

describe('PortForwardPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    profileTesting.reset();
  });

  it('matches the snapshot for an empty profile', () => {
    const { asFragment } = render(<PortForwardPanel profileId="snapshot-profile" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('updates status chip when activating a forward', async () => {
    render(<PortForwardPanel profileId="profile-1" />);

    fireEvent.change(screen.getByLabelText('Source port'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Destination host'), {
      target: { value: 'internal.service' },
    });
    fireEvent.change(screen.getByLabelText('Destination port'), { target: { value: '8080' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Forward' }));

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Stopped')).toBeInTheDocument();

    const toggle = within(item).getByLabelText('Activate forward 3000 to internal.service:8080');
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    await waitFor(() => expect(within(item).getByText('Listening')).toBeInTheDocument());

    const events = profileTesting.getEvents();
    expect(events).toEqual([
      expect.objectContaining({ type: 'started', profileId: 'profile-1' }),
    ]);
  });

  it('tears down active listeners on unmount', async () => {
    const { unmount } = render(<PortForwardPanel profileId="cleanup" />);

    fireEvent.change(screen.getByLabelText('Source port'), { target: { value: '4000' } });
    fireEvent.change(screen.getByLabelText('Destination host'), {
      target: { value: 'db.internal' },
    });
    fireEvent.change(screen.getByLabelText('Destination port'), { target: { value: '5432' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Forward' }));

    const item = screen.getByRole('listitem');
    const toggle = within(item).getByLabelText('Activate forward 4000 to db.internal:5432');
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());

    unmount();

    const events = profileTesting.getEvents();
    expect(events).toEqual([
      expect.objectContaining({ type: 'started', profileId: 'cleanup' }),
      expect.objectContaining({ type: 'stopped', profileId: 'cleanup' }),
    ]);
  });
});

