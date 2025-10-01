import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkipLink from '../components/common/SkipLink';

describe('SkipLink', () => {
  it('focuses the provided target when activated', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink targetId="custom-main">Skip to content</SkipLink>
        <main id="custom-main">Main area</main>
      </>,
    );

    const link = screen.getByRole('link', { name: /skip to content/i });
    link.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('falls back to the first main element when target id is missing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink>Skip to content</SkipLink>
        <main>Main fallback</main>
      </>,
    );

    const link = screen.getByRole('link', { name: /skip to content/i });
    await user.click(link);

    expect(screen.getByRole('main')).toHaveFocus();
  });
});
