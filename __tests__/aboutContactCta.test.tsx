import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContactCTA } from '../components/apps/alex';

jest.mock('react-ga4', () => ({
  send: jest.fn(),
  event: jest.fn(),
}));

describe('ContactCTA', () => {
  const originalSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  afterEach(() => {
    if (originalSiteKey === undefined) {
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    } else {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = originalSiteKey;
    }
    jest.clearAllMocks();
  });

  it('renders the contact CTA when the site key is configured', () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-key';

    render(<ContactCTA />);

    expect(
      screen.getByRole('button', { name: /open contact window/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/set next_public_recaptcha_site_key to enable contact/i)
    ).not.toBeInTheDocument();
  });

  it('shows a configuration hint when the site key is missing', () => {
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    render(<ContactCTA />);

    expect(
      screen.getByText(/set next_public_recaptcha_site_key to enable contact/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /open contact window/i })
    ).not.toBeInTheDocument();
  });
});
