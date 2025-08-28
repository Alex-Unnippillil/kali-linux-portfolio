import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutApp from '../components/apps/About';

describe('AboutApp accessibility', () => {
  it('supports roving tabindex for navigation tabs', async () => {
    const user = userEvent.setup();
    render(<AboutApp />);
    const tablist = screen.getAllByRole('tablist')[0];
    const tabs = within(tablist).getAllByRole('tab');
    expect(tablist).toHaveAttribute('aria-orientation', 'vertical');
    tabs[0].focus();
    await user.keyboard('{ArrowDown}');
    const updatedTabs = within(tablist).getAllByRole('tab');
    expect(updatedTabs[1]).toHaveFocus();
    expect(updatedTabs[1]).toHaveAttribute('aria-selected', 'true');
  });
});

