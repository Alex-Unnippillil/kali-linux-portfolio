import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('marked', () => ({
  marked: {
    parseInline: (value: string) => value,
  },
}));

jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: (value: string) => value },
  sanitize: (value: string) => value,
}));

import ReleaseNotesModal from '../components/common/ReleaseNotesModal';

type ReleasePayload = {
  generatedAt: string;
  source: { changelog: string };
  latest: {
    version: string;
    date: string;
    url: string;
    sections: { title: string; items: string[] }[];
  } | null;
  entries: unknown[];
};

const createPayload = (version: string): ReleasePayload => ({
  generatedAt: '2024-01-01T00:00:00.000Z',
  source: { changelog: 'https://example.com/changelog' },
  latest: {
    version,
    date: '2024-12-11',
    url: `https://example.com/${version}`,
    sections: [
      { title: 'Added', items: ['New feature [docs](https://example.com/feature)'] },
      { title: 'Fixed', items: ['Stability improvements'] },
    ],
  },
  entries: [],
});

describe('ReleaseNotesModal', () => {
  let originalFetch: typeof fetch;
  let fetchMock: jest.Mock;
  let root: HTMLDivElement;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    localStorage.clear();
    root = document.createElement('div');
    root.id = '__next';
    document.body.appendChild(root);
  });

  afterEach(() => {
    cleanup();
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
    if (originalFetch) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  const mockFetch = (data: ReleasePayload = createPayload('3.2.1')) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => data,
    } as unknown as Response);
  };

  const resetRoot = () => {
    cleanup();
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
    root = document.createElement('div');
    root.id = '__next';
    document.body.appendChild(root);
  };

  test('renders modal when latest version has not been seen', async () => {
    const payload = createPayload('3.2.1');
    mockFetch(payload);

    render(<ReleaseNotesModal />, { container: root });

    expect(fetchMock).toHaveBeenCalledWith('/release-notes.json', expect.any(Object));

    const heading = await screen.findByRole('heading', { name: /3\.2\.1/ });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText('New feature [docs](https://example.com/feature)'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View full changelog/i })).toHaveAttribute(
      'href',
      payload.latest?.url ?? payload.source.changelog,
    );
  });

  test('persists mute preference per profile', async () => {
    const profileKey = 'desktop:active-profile';
    localStorage.setItem(profileKey, 'ops');

    mockFetch(createPayload('3.2.1'));
    const first = render(<ReleaseNotesModal />, { container: root });

    const heading = await screen.findByRole('heading', { name: /3\.2\.1/ });
    expect(heading).toBeInTheDocument();

    const muteToggle = screen.getByLabelText(/Don't show again/i);
    fireEvent.click(muteToggle);
    expect(localStorage.getItem('release-notes:ops:muted')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /3\.2\.1/ })).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem('release-notes:ops:last-seen')).toBe('3.2.1');

    first.unmount();
    resetRoot();

    fetchMock.mockReset();
    localStorage.setItem(profileKey, 'ops');
    mockFetch(createPayload('4.0.0'));
    const second = render(<ReleaseNotesModal />, { container: root });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /4\.0\.0/ })).not.toBeInTheDocument(),
    );
    second.unmount();
    resetRoot();

    fetchMock.mockReset();
    localStorage.setItem(profileKey, 'blue');
    mockFetch(createPayload('4.0.0'));
    render(<ReleaseNotesModal />, { container: root });
    const newHeading = await screen.findByRole('heading', { name: /4\.0\.0/ });
    expect(newHeading).toBeInTheDocument();
  });
});
