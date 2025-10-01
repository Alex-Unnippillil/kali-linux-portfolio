import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RedactionPreview from '../components/common/RedactionPreview';
import { getPlaceholder } from '../utils/redaction';
import { clearAuditTrail, getAuditTrail } from '../utils/auditLog';

describe('RedactionPreview', () => {
  let confirmSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    clearAuditTrail();
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('redacts content and emits changes', async () => {
    const handleChange = jest.fn();
    render(
      <RedactionPreview
        content={'admin@example.com 10.0.0.1 example.org'}
        onChange={handleChange}
        context="test"
      />,
    );
    await waitFor(() => expect(handleChange).toHaveBeenCalled());
    const lastCall = handleChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toContain(getPlaceholder('email'));
    expect(lastCall?.[0]).toContain(getPlaceholder('ip'));
    expect(lastCall?.[0]).toContain(getPlaceholder('domain'));
  });

  it('allows revealing categories with confirmation', async () => {
    const handleChange = jest.fn();
    render(
      <RedactionPreview
        content={'admin@example.com 10.0.0.1 example.org'}
        onChange={handleChange}
        context="test"
      />,
    );

    const emailToggle = screen.getByLabelText('Redact Email Addresses') as HTMLInputElement;
    expect(emailToggle.checked).toBe(true);
    fireEvent.click(emailToggle);

    await waitFor(() => {
      const lastCall = handleChange.mock.calls.at(-1);
      expect(lastCall?.[0]).toContain('admin@example.com');
    });

    const auditEvents = getAuditTrail().filter((event) => event.category === 'email');
    expect(auditEvents.some((event) => event.action === 'reveal')).toBe(true);
  });

  it('supports reveal once flow', async () => {
    render(
      <RedactionPreview
        content={'admin@example.com 10.0.0.1 example.org'}
        context="test"
      />,
    );

    const revealOnce = screen.getByRole('button', { name: /Reveal Email Addresses once/i });
    fireEvent.click(revealOnce);

    const status = await screen.findByRole('status');
    expect(within(status).getByText('admin@example.com')).toBeInTheDocument();

    const auditEvents = getAuditTrail().filter((event) => event.category === 'email');
    expect(auditEvents.some((event) => event.action === 'peek')).toBe(true);
  });
});
