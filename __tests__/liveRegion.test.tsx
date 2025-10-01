import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Announcer from '../components/common/Announcer';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';
import { useAnnounce } from '../hooks/useAnnounce';

describe('global live announcer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('announces toast messages politely and clears after delay', async () => {
    render(
      <Announcer>
        <Toast message="Saved" />
      </Announcer>,
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Saved'),
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('announces form errors assertively', async () => {
    render(
      <Announcer>
        <FormError>Required field</FormError>
      </Announcer>,
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Required field'),
    );
  });

  it('deduplicates identical messages until cleared', async () => {
    const Trigger: React.FC = () => {
      const { announcePolite } = useAnnounce();
      const [result, setResult] = useState<string>('idle');

      useEffect(() => {
        const initial = announcePolite('Process finished');
        setResult(initial ? 'announced' : 'skipped');
      }, [announcePolite]);

      return (
        <button
          type="button"
          data-testid="repeat"
          onClick={() =>
            setResult(announcePolite('Process finished') ? 'announced' : 'skipped')
          }
        >
          {result}
        </button>
      );
    };

    render(
      <Announcer>
        <Trigger />
      </Announcer>,
    );

    const button = screen.getByTestId('repeat');
    expect(button).toHaveTextContent('announced');

    fireEvent.click(button);
    expect(button).toHaveTextContent('skipped');

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('');

    fireEvent.click(button);
    expect(button).toHaveTextContent('announced');
  });
});
