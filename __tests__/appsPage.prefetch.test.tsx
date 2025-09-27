import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const prefetchMock = jest.fn(() => Promise.resolve());
const loadAppRegistryMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    prefetch: prefetchMock,
  }),
}));

jest.mock('next/image', () => (props: any) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ''} />;
});

jest.mock('../lib/appRegistry', () => {
  const actual = jest.requireActual('../lib/appRegistry');
  return {
    ...actual,
    loadAppRegistry: () => loadAppRegistryMock(),
  };
});

import AppsPage from '../pages/apps/index';

describe('AppsPage prefetch behaviour', () => {
  beforeEach(() => {
    prefetchMock.mockClear();
    loadAppRegistryMock.mockResolvedValue({
      apps: [
        { id: 'test-app', title: 'Test App', icon: '' },
        { id: 'other-app', title: 'Other App', icon: '' },
      ],
      metadata: {},
    });
  });

  it('prefetches an app route when the card is hovered', async () => {
    render(<AppsPage />);

    const link = await screen.findByRole('link', { name: 'Test App' });
    const card = link.parentElement as HTMLElement;

    fireEvent.mouseEnter(card);

    await waitFor(() => {
      expect(prefetchMock).toHaveBeenCalledWith('/apps/test-app');
    });

    fireEvent.mouseEnter(card);
    expect(prefetchMock).toHaveBeenCalledTimes(1);
  });
});
