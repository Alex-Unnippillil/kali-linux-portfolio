import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HtmlRewriterApp from '../apps/html-rewriter';

describe('HtmlRewriterApp help modal', () => {
  it('opens the help modal when the icon button is clicked', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    const trigger = screen.getByRole('button', { name: /open rewrite help/i });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /html rewriter help/i });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /selectors/i, selected: true })
    ).toBeInTheDocument();
  });

  it('shows sample payload rules when that tab is active', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    await user.click(screen.getByRole('button', { name: /open rewrite help/i }));
    await user.click(screen.getByRole('tab', { name: /sample payloads/i }));

    const tabpanel = screen.getByRole('tabpanel', { name: /sample payloads/i });
    expect(within(tabpanel).getByText(/"selector": "script"/i)).toBeInTheDocument();
    expect(within(tabpanel).getByText(/"value": "\[image removed\]"/i)).toBeInTheDocument();
  });
});
