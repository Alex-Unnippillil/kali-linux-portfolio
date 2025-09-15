import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalyticsConsentBanner from '../components/common/AnalyticsConsentBanner';

describe('AnalyticsConsentBanner', () => {
  it('calls onAccept and hides when Allow is clicked', () => {
    const onAccept = jest.fn();
    render(<AnalyticsConsentBanner onAccept={onAccept} />);
    fireEvent.click(screen.getByRole('button', { name: /allow/i }));
    expect(onAccept).toHaveBeenCalled();
    expect(screen.queryByText(/anonymous analytics/i)).toBeNull();
  });
});
