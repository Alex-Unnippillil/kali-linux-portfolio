import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResultCard from '../src/components/SearchResultCard';
import { trackEvent } from '@/lib/analytics-client';

jest.mock('@/lib/analytics-client', () => ({ trackEvent: jest.fn() }));

describe('SearchResultCard', () => {
  beforeEach(() => {
    (trackEvent as jest.Mock).mockClear();
    delete process.env.NEXT_PUBLIC_SEARCH_RESULT_INTENT_LAYOUT;
    delete process.env.NEXT_PUBLIC_SEARCH_RESULT_AB_TEST;
  });

  it('renders legacy layout when feature flag disabled', () => {
    process.env.NEXT_PUBLIC_SEARCH_RESULT_INTENT_LAYOUT = 'false';
    render(
      <SearchResultCard title="Title" description="Desc" url="#" intent="download" />,
    );
    expect(screen.getByTestId('legacy-layout')).toBeInTheDocument();
  });

  it('switches layout based on intent when feature flag enabled', () => {
    process.env.NEXT_PUBLIC_SEARCH_RESULT_INTENT_LAYOUT = 'true';
    render(<SearchResultCard title="Title" url="#" intent="download" />);
    expect(screen.getByRole('link').getAttribute('data-layout')).toBe('download');
  });

  it('tracks click with variant when A/B test enabled', () => {
    process.env.NEXT_PUBLIC_SEARCH_RESULT_INTENT_LAYOUT = 'true';
    process.env.NEXT_PUBLIC_SEARCH_RESULT_AB_TEST = 'true';
    render(<SearchResultCard title="Title" url="#" intent="navigate" />);
    fireEvent.click(screen.getByRole('link'));
    expect(trackEvent).toHaveBeenCalledWith(
      'search_result_click',
      expect.objectContaining({ intent: 'navigate', variant: expect.any(String) }),
    );
  });
});
