import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';
import ProgressBar from '../components/ui/ProgressBar';
import { LiveRegionProvider, useLiveRegion } from '../hooks/useLiveRegion';

describe('live region manager', () => {
  const renderWithLiveRegion = (
    ui: React.ReactElement,
    onAnnounce: (message: string) => void,
  ) =>
    render(
      <LiveRegionProvider
        onAnnounce={(message) => {
          onAnnounce(message);
        }}
      >
        {ui}
      </LiveRegionProvider>,
    );

  it('announces toast messages once', async () => {
    const announcements: string[] = [];
    renderWithLiveRegion(<Toast message="Saved" />, (msg) => announcements.push(msg));

    await waitFor(() => expect(announcements).toContain('Saved'));
    expect(announcements.filter((msg) => msg === 'Saved')).toHaveLength(1);
  });

  it('announces form errors when the text changes', async () => {
    const announcements: string[] = [];
    const handleAnnounce = (msg: string) => announcements.push(msg);
    const { rerender } = render(
      <LiveRegionProvider onAnnounce={handleAnnounce}>
        <FormError>Required field</FormError>
      </LiveRegionProvider>,
    );

    await waitFor(() => expect(announcements).toContain('Required field'));
    expect(announcements.filter((msg) => msg === 'Required field')).toHaveLength(1);

    rerender(
      <LiveRegionProvider onAnnounce={handleAnnounce}>
        <FormError>Still required</FormError>
      </LiveRegionProvider>,
    );

    await waitFor(() => expect(announcements).toContain('Still required'));
    expect(announcements.filter((msg) => msg === 'Still required')).toHaveLength(1);
  });

  it('throttles duplicate announcements', async () => {
    const announcements: string[] = [];

    const DuplicateAnnouncer = () => {
      const { announce } = useLiveRegion();
      return (
        <button
          type="button"
          onClick={() => {
            announce('Saved message');
            announce('Saved message');
          }}
        >
          Trigger duplicates
        </button>
      );
    };

    renderWithLiveRegion(<DuplicateAnnouncer />, (msg) => announcements.push(msg));

    fireEvent.click(screen.getByRole('button', { name: 'Trigger duplicates' }));

    await waitFor(() => expect(announcements).toContain('Saved message'));
    expect(announcements.filter((msg) => msg === 'Saved message')).toHaveLength(1);
  });

  it('emits a single announcement per progress update', async () => {
    const announcements: string[] = [];

    const ProgressHarness = () => {
      const [value, setValue] = useState(0);
      return (
        <>
          <ProgressBar progress={value} />
          <button type="button" onClick={() => setValue(50)}>
            Set to 50
          </button>
          <button type="button" onClick={() => setValue(50)}>
            Set to 50 again
          </button>
          <button type="button" onClick={() => setValue(75)}>
            Set to 75
          </button>
        </>
      );
    };

    renderWithLiveRegion(<ProgressHarness />, (msg) => announcements.push(msg));

    await waitFor(() => expect(announcements).toContain('Progress 0 percent'));

    fireEvent.click(screen.getByRole('button', { name: 'Set to 50' }));
    await waitFor(() => expect(announcements).toContain('Progress 50 percent'));
    expect(announcements.filter((msg) => msg === 'Progress 50 percent')).toHaveLength(1);

    const countAfterFirst = announcements.length;
    fireEvent.click(screen.getByRole('button', { name: 'Set to 50 again' }));
    await waitFor(() => expect(announcements.length).toBe(countAfterFirst));

    fireEvent.click(screen.getByRole('button', { name: 'Set to 75' }));
    await waitFor(() => expect(announcements).toContain('Progress 75 percent'));
    expect(announcements.filter((msg) => msg === 'Progress 75 percent')).toHaveLength(1);
  });
});
