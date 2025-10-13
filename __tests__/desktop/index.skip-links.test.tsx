import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../pages/index';

jest.mock('../../components/SEO/Meta', () => () => <div data-testid="meta" />);
jest.mock('../../components/ubuntu', () => () => <div data-testid="ubuntu" />);
jest.mock('../../components/BetaBadge', () => () => <div data-testid="beta" />);

describe('index page skip links', () => {
  it('exposes skip links for the app grid and desktop content', async () => {
    render(<App />);
    const skipToGrid = screen.getByRole('link', { name: /skip to app grid/i });
    const skipToContent = screen.getByRole('link', { name: /skip to desktop content/i });

    expect(skipToGrid).toHaveAttribute('href', '#app-grid');
    expect(skipToContent).toHaveAttribute('href', '#window-area');

    const user = userEvent.setup();
    await user.tab();
    expect(skipToGrid).toHaveFocus();
    await user.tab();
    expect(skipToContent).toHaveFocus();
  });
});
