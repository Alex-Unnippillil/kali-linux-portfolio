import React from 'react';
import { render, screen } from '@testing-library/react';
import AppTooltipContent from '../components/ui/AppTooltipContent';

describe('AppTooltipContent', () => {
  const meta = {
    title: 'Example App',
    description: 'A sample description for the tooltip to render.',
    path: '/apps/example',
    keyboard: ['Ctrl + K', 'Shift + A'],
  };

  it('renders metadata with constrained width and arrow offset', () => {
    render(<AppTooltipContent meta={meta} placement="bottom" arrowOffset={120} />);

    const container = screen.getByTestId('app-tooltip-content');
    expect(container).toHaveStyle({ maxWidth: '20rem' });
    expect(container).toHaveStyle({ width: 'min(20rem, calc(100vw - 2rem))' });

    const arrow = screen.getByTestId('app-tooltip-arrow');
    expect(arrow.style.left).toBe('120px');
    expect(arrow.style.top).toBe('-6px');
  });

  it('positions the arrow below content when placement is top', () => {
    render(<AppTooltipContent meta={meta} placement="top" arrowOffset={48} />);

    const arrow = screen.getByTestId('app-tooltip-arrow');
    expect(arrow.style.left).toBe('48px');
    expect(arrow.style.bottom).toBe('-6px');
  });

  it('shows fallback text when metadata is unavailable', () => {
    render(<AppTooltipContent meta={null} />);

    expect(screen.getByText('Metadata unavailable.')).toBeInTheDocument();
  });
});
