import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PipPortal, { DEFAULT_PACKAGE_HINTS, PipPackageHint, validatePackageName } from '../components/util-components/PipPortal';

const setNavigatorOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

describe('PipPortal component', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterAll(() => {
    setNavigatorOnline(true);
  });

  it('validates package names correctly', () => {
    expect(validatePackageName('requests')).toBe(true);
    expect(validatePackageName('requests-html')).toBe(true);
    expect(validatePackageName('invalid package')).toBe(false);
    expect(validatePackageName('!oops')).toBe(false);
  });

  it('filters out invalid package names from rendering', () => {
    const hints: PipPackageHint[] = [
      { name: 'valid_pkg', description: 'Valid description' },
      { name: 'invalid pkg', description: 'This should be filtered' },
    ];

    render(<PipPortal packages={hints} />);

    expect(screen.getByRole('article', { name: /installation hints for valid_pkg/i })).toBeInTheDocument();
    expect(screen.queryByText('invalid pkg')).not.toBeInTheDocument();
    expect(screen.getByText(/Skipped invalid package names/i)).toBeInTheDocument();
  });

  it('shows offline fallback messaging when offline', async () => {
    setNavigatorOnline(false);
    render(<PipPortal />);

    await waitFor(() => expect(screen.getByText(/Offline mode detected/i)).toBeInTheDocument());
  });

  it('copies the Linux install command to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<PipPortal packages={DEFAULT_PACKAGE_HINTS.slice(0, 1)} />);

    const copyButton = await screen.findByRole('button', {
      name: /Copy Linux install command for requests/i,
    });

    await userEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('sudo -H pip3 install requests');
    });
  });
});
