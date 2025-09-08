import { renderHook } from '@testing-library/react';
import { track } from '@vercel/analytics';
import { reportWebVitals } from '@/utils/reportWebVitals';
import useReportWebVitals from '@/hooks/useReportWebVitals';
import { useReportWebVitals as nextUseReportWebVitals } from 'next/web-vitals';

jest.mock('next/web-vitals', () => ({
  useReportWebVitals: jest.fn(),
}));

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/utils/reportWebVitals', () => ({
  reportWebVitals: jest.fn(),
}));

describe('useReportWebVitals', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    window.localStorage.setItem('analytics-enabled', 'true');
  });
  it('forwards metrics to analytics services', () => {
    const metric = { id: '1', name: 'LCP', value: 123 } as any;
    (nextUseReportWebVitals as jest.Mock).mockImplementation((cb: any) => cb(metric));

    renderHook(() => useReportWebVitals());

    expect(track).toHaveBeenCalledWith('LCP', { id: '1', value: 123 });
    expect(reportWebVitals).toHaveBeenCalledWith(metric);
  });
});
