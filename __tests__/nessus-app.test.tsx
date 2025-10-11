import { fireEvent, render, screen, within } from '@testing-library/react';
import Nessus from '../components/apps/nessus/index';

describe('Nessus lab simulator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders lab mode messaging and default fixture findings', () => {
    render(<Nessus />);
    expect(screen.getByText(/Lab mode enabled/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /External perimeter baseline/i })
    ).toHaveAttribute('aria-pressed', 'true');
    const findingsTable = screen.getByRole('table');
    expect(
      within(findingsTable).getByText('OpenSSL Heartbeat Information Disclosure')
    ).toBeInTheDocument();
  });

  it('filters findings by severity through navigation controls', () => {
    render(<Nessus />);
    const findingsNav = screen.getByRole('region', {
      name: /Findings navigation/i,
    });
    const criticalButton = within(findingsNav).getByRole('button', {
      name: /Critical/,
    });
    fireEvent.click(criticalButton);

    const findingsTable = screen.getByRole('table');

    expect(
      within(findingsTable).getByText('Weak SSH Cipher')
    ).toBeInTheDocument();
    expect(
      within(findingsTable).queryByText('Apache HTTP Server Privilege Escalation')
    ).not.toBeInTheDocument();
  });

  it('switches fixtures when another scan is selected', () => {
    render(<Nessus />);
    const internalSweepButton = screen.getByRole('button', {
      name: /Internal validation sweep/i,
    });
    fireEvent.click(internalSweepButton);

    const findingsTable = screen.getByRole('table');

    expect(within(findingsTable).getByText('Outdated Software')).toBeInTheDocument();
    expect(
      within(findingsTable).queryByText('OpenSSL Heartbeat Information Disclosure')
    ).not.toBeInTheDocument();
  });
});
