import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { PresentationModeProvider, usePresentationMode } from '../components/common/PresentationModeContext';
import useNotifications from '../hooks/useNotifications';

describe('presentation mode', () => {
  const Harness: React.FC = () => {
    const { pushNotification } = useNotifications();
    const { toggle, enabled } = usePresentationMode();
    return (
      <div>
        <button data-testid="notify-hello" onClick={() => pushNotification('demo', 'Hello notification')}>
          Notify hello
        </button>
        <button data-testid="notify-hidden" onClick={() => pushNotification('demo', 'Hidden notification')}>
          Notify hidden
        </button>
        <button data-testid="toggle" onClick={() => toggle()}>
          {enabled ? 'Disable presentation' : 'Enable presentation'}
        </button>
      </div>
    );
  };

  const renderHarness = () =>
    render(
      <NotificationCenter>
        <PresentationModeProvider>
          <Harness />
        </PresentationModeProvider>
      </NotificationCenter>,
    );

  it('suppresses notifications when enabled', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('notify-hello'));
    expect(screen.getByText('Hello notification')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByText(/Notifications muted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('notify-hidden'));
    expect(screen.queryByText('Hidden notification')).not.toBeInTheDocument();
  });

  it('dims the pointer while active', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('toggle'));
    fireEvent.pointerMove(document, { clientX: 100, clientY: 120 });
    expect(document.body.classList.contains('presentation-mode')).toBe(true);
    expect(document.querySelector('.presentation-pointer')).not.toBeNull();

    fireEvent.click(screen.getByTestId('toggle'));
    expect(document.body.classList.contains('presentation-mode')).toBe(false);
  });
});
