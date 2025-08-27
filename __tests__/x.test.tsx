import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import XApp from '../components/apps/x';

// Mock next/script to immediately invoke onLoad
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onLoad }: { onLoad?: () => void }) => {
    React.useEffect(() => {
      onLoad && onLoad();
    }, [onLoad]);
    return null;
  },
}));

describe('XApp', () => {
  beforeEach(() => {
    // stub twttr widgets API
    // @ts-ignore
    window.twttr = {
      widgets: {
        createTimeline: jest.fn((config: any, el: HTMLElement) => {
          el.textContent = config.screenName || config.url;
          return Promise.resolve({});
        }),
      },
    };
    window.localStorage.clear();
  });

  it('renders timeline after script load', async () => {
    window.localStorage.setItem('x-handle', JSON.stringify('jack'));
    render(<XApp />);
    await waitFor(() =>
      expect(window.twttr.widgets.createTimeline).toHaveBeenCalled()
    );
    expect(document.getElementById('timeline')).toHaveTextContent('jack');
  });

  it('updates timeline when handle changes', async () => {
    render(<XApp />);
    // wait for initial render with default handle
    await waitFor(() =>
      expect(document.getElementById('timeline')).toHaveTextContent('AUnnippillil')
    );
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/enter handle/i);
    await user.clear(input);
    await user.type(input, 'twitterdev');
    await user.click(screen.getByRole('button', { name: /load/i }));

    await waitFor(() =>
      expect(document.getElementById('timeline')).toHaveTextContent('twitterdev')
    );
    expect(document.getElementById('timeline')).not.toHaveTextContent('AUnnippillil');
  });
});

