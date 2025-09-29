import { fireEvent, render, screen } from '@testing-library/react';
import Redactor, { redactSecrets } from './Redactor';

describe('redactSecrets', () => {
  it('masks hashes, tickets, and passwords with placeholders', () => {
    const sample = [
      'NTLM : 8846f7eaee8fb117ad06bdd830b7586c',
      'Kerberos Ticket : doEuUTSgAQIDBAUGBwgJCg==',
      'Password : SuperSecret!23',
      'Token: FEDCBA9876543210FEDCBA9876543210',
    ].join('\n');

    const sanitized = redactSecrets(sample);

    expect(sanitized).not.toContain('8846f7eaee8fb117ad06bdd830b7586c');
    expect(sanitized).toContain('NTLM : ********');

    expect(sanitized).not.toContain('doEuUTSgAQIDBAUGBwgJCg==');
    expect(sanitized).toContain('Kerberos Ticket : ********');

    expect(sanitized).not.toContain('SuperSecret!23');
    expect(sanitized).toContain('Password : ********');

    expect(sanitized).not.toContain('FEDCBA9876543210FEDCBA9876543210');
    expect(sanitized).toContain('Token: ********');
  });

  it('does not redact benign identifiers', () => {
    const sample = ['User : Administrator', 'Ticket cache: user@EXAMPLE.COM'].join('\n');

    const sanitized = redactSecrets(sample);

    expect(sanitized).toContain('Administrator');
    expect(sanitized).toContain('Ticket cache: user@EXAMPLE.COM');
  });
});

describe('Redactor component', () => {
  it('toggles between sanitized and original text', () => {
    const sample = 'Password : SuperSecret!23';
    render(<Redactor initialValue={sample} />);

    const preview = screen.getByLabelText(/Redactor preview/i);
    expect(preview).toHaveTextContent('Password : ********');

    const toggle = screen.getByRole('checkbox', { name: /Toggle redaction/i });
    fireEvent.click(toggle);
    expect(preview).toHaveTextContent(sample);

    fireEvent.click(toggle);
    expect(preview).toHaveTextContent('Password : ********');
  });
});
