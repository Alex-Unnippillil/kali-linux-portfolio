import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
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
      screen.getByRole('tab', { name: /selectors/i, selected: true }),
    ).toBeInTheDocument();
  });

  it('shows sample payload rules when that tab is active', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    await user.click(screen.getByRole('button', { name: /open rewrite help/i }));
    await user.click(screen.getByRole('tab', { name: /sample payloads/i }));

    const tabpanel = screen.getByRole('tabpanel', { name: /sample payloads/i });
    expect(within(tabpanel).getByText(/"selector": "script"/i)).toBeInTheDocument();
    expect(
      within(tabpanel).getByText(/"value": "\[image removed\]"/i),
    ).toBeInTheDocument();
  });

  it('closes the help modal with Escape', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    await user.click(screen.getByRole('button', { name: /open rewrite help/i }));
    expect(screen.getByRole('dialog', { name: /html rewriter help/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /html rewriter help/i }),
      ).not.toBeInTheDocument();
    });
  });
});

describe('HtmlRewriterApp rewriting', () => {
  it('rewrites the output when rules change', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    const rulesInput = screen.getByLabelText(/rewrite rules in json/i);
    fireEvent.change(rulesInput, {
      target: {
        value: `[{ "selector": "h1", "action": "replaceText", "value": "Updated" }]`,
      },
    });

    const outputPanel = screen.getByRole('tabpanel', { name: /rewritten html/i });
    await waitFor(() => {
      expect(within(outputPanel).getByText(/Updated/)).toBeInTheDocument();
    });
  });

  it('surfaces invalid selector errors without crashing', async () => {
    const user = userEvent.setup();
    render(<HtmlRewriterApp />);

    const rulesInput = screen.getByLabelText(/rewrite rules in json/i);
    fireEvent.change(rulesInput, {
      target: {
        value: `[{ "selector": "div[", "action": "remove" }]`,
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Rule 1:/i)).toBeInTheDocument();
    });

    const outputPanel = screen.getByRole('tabpanel', { name: /rewritten html/i });
    expect(outputPanel).toBeInTheDocument();
  });
});
