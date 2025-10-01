import { render, screen } from '@testing-library/react';
import Skeleton from '@/components/ui/Skeleton';
import Spinner from '@/components/ui/Spinner';
import { announce, ANNOUNCER_EVENT, type AnnounceDetail } from '@/utils/liveAnnouncer';

describe('loading components accessibility', () => {
  it('marks parent containers busy while skeletons are mounted', () => {
    const { rerender } = render(
      <div data-testid="wrapper">
        <Skeleton data-testid="skeleton" />
      </div>,
    );

    expect(screen.getByTestId('wrapper')).toHaveAttribute('aria-busy', 'true');

    rerender(<div data-testid="wrapper" />);

    expect(screen.getByTestId('wrapper')).not.toHaveAttribute('aria-busy');
  });

  it('toggles aria-busy when spinner active state changes', () => {
    const { rerender } = render(
      <div data-testid="container">
        <Spinner label="Loading content" />
      </div>,
    );

    expect(screen.getByTestId('container')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <div data-testid="container">
        <Spinner label="Loading content" active={false} />
      </div>,
    );

    expect(screen.getByTestId('container')).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dispatches announcer events with message detail', () => {
    const handler = jest.fn((event: CustomEvent<AnnounceDetail>) => event.detail);
    window.addEventListener(ANNOUNCER_EVENT, handler as EventListener);

    announce('Data ready');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ detail: { message: 'Data ready' } });

    window.removeEventListener(ANNOUNCER_EVENT, handler as EventListener);
  });
});
