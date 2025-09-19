import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiskQuotaBanner from '../components/DiskQuotaBanner';

type Estimate = { usage?: number; quota?: number; usageDetails?: StorageEstimate['usageDetails'] };

const setNavigatorEstimate = (estimate: Estimate) => {
  Object.defineProperty(window.navigator, 'storage', {
    configurable: true,
    value: {
      estimate: jest.fn().mockResolvedValue(estimate),
    },
  });
};

const clearNavigatorEstimate = () => {
  try {
    // @ts-ignore - allow deleting the mocked property
    delete window.navigator.storage;
  } catch {
    /* ignore */
  }
};

describe('DiskQuotaBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clearNavigatorEstimate();
    jest.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders a warning when usage exceeds 80%', async () => {
    setNavigatorEstimate({ usage: 900 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    render(<DiskQuotaBanner />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/90% used/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear space/i })).toBeInTheDocument();
  });

  it('does not render when usage is below threshold', async () => {
    setNavigatorEstimate({ usage: 100 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    render(<DiskQuotaBanner />);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('skips warnings in safe mode', async () => {
    localStorage.setItem('safe-mode', 'true');
    setNavigatorEstimate({ usage: 950 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    render(<DiskQuotaBanner />);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('persists dismissal per profile', async () => {
    localStorage.setItem('active-profile', 'ops');
    localStorage.setItem('disk-quota-dismissed:ops', 'true');
    setNavigatorEstimate({ usage: 900 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    const { unmount } = render(<DiskQuotaBanner />);
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    unmount();
    clearNavigatorEstimate();
    setNavigatorEstimate({ usage: 900 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    localStorage.setItem('active-profile', 'qa');
    render(<DiskQuotaBanner />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('invokes the cleanup tool and marks dismissal when clearing space', async () => {
    setNavigatorEstimate({ usage: 850 * 1024 * 1024, quota: 1000 * 1024 * 1024 });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<DiskQuotaBanner />);
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear space/i }));

    expect(sessionStorage.getItem('trash-filter')).toBe('expiring');
    expect(localStorage.getItem('disk-quota-dismissed:default')).toBe('true');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 'trash' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
