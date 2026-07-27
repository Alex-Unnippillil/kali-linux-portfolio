import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactApp, { processContactForm } from '../components/apps/contact';

describe('contact form', () => {
  it('invalid email blocked', async () => {
    const fetchMock = jest.fn();
    const result = await processContactForm(
      {
        name: 'A',
        email: 'invalid',
        message: 'Hi',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('success posts to api', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    const result = await processContactForm(
      {
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello',
        honeypot: '',
        csrfToken: 'csrf',
        recaptchaToken: 'rc',
      },
      fetchMock
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf' }),
      })
    );
    expect(result.success).toBe(true);
  });
});

describe('ContactApp error summary accessibility', () => {
  beforeEach(() => {
    (window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: jest.fn().mockResolvedValue('token'),
    };
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-key';
  });

  afterEach(() => {
    delete (window as any).grecaptcha;
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  });

  it('focuses the error banner and allows tabbing to error links', async () => {
    const user = userEvent.setup();
    render(<ContactApp />);

    await user.type(screen.getByLabelText('Name'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveFocus();

    await user.tab();
    const emailLink = screen.getByRole('link', { name: /Email: Invalid email/i });
    expect(emailLink).toHaveFocus();

    await user.tab();
    const messageLink = screen.getByRole('link', {
      name: /Message: 1-1000 chars/i,
    });
    expect(messageLink).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('scrolls and focuses the field when an error link is activated', async () => {
    const user = userEvent.setup();
    render(<ContactApp />);

    await user.type(screen.getByLabelText('Name'), 'Test User');
    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const emailInput = screen.getByLabelText('Email');
    const scrollSpy = jest.fn();
    (emailInput as any).scrollIntoView = scrollSpy;

    const emailLink = await screen.findByRole('link', {
      name: /Email: Invalid email/i,
    });

    await user.click(emailLink);

    expect(emailInput).toHaveFocus();
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });
});
