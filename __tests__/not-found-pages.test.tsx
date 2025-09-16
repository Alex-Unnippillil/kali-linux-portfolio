import { render, screen } from '@testing-library/react';

import AppsNotFound from '../app/apps/not-found';
import RootNotFound from '../app/not-found';

describe('App Router not-found pages', () => {
  it('links back to the desktop from the root not found page', () => {
    render(<RootNotFound />);
    const link = screen.getByRole('link', { name: /return to desktop/i });

    expect(link).toHaveAttribute('href', '/');
  });

  it('links to the app launcher from the apps not found page', () => {
    render(<AppsNotFound />);
    const link = screen.getByRole('link', { name: /browse apps/i });

    expect(link).toHaveAttribute('href', '/apps');
  });
});
