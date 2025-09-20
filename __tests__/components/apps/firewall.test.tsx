import { fireEvent, render, screen } from '@testing-library/react';
import FirewallApp from '../../../components/apps/firewall';
import { logEvent } from '../../../utils/analytics';
import { getFirewallState, resetFirewallState } from '../../../utils/firewallStore';

jest.mock('../../../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

const mockedLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

describe('FirewallApp', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFirewallState();
    mockedLogEvent.mockReset();
  });

  it('renders the Home profile by default with seeded rules', () => {
    render(<FirewallApp />);
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('profile-description')).toHaveTextContent('Balanced defaults');
    expect(screen.getAllByText('Web Browser')).toHaveLength(2);
    expect(screen.getByText('Unknown Inbound')).toBeInTheDocument();
  });

  it('switches profiles and logs an analytics event', () => {
    render(<FirewallApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Work' }));
    expect(mockedLogEvent).toHaveBeenCalledWith({
      category: 'firewall',
      action: 'profile_change',
      label: 'Work',
    });
    expect(screen.getByText('VPN Client')).toBeInTheDocument();
    expect(screen.queryByText('Unknown Inbound')).not.toBeInTheDocument();
  });

  it('adds a custom rule to the active profile', () => {
    render(<FirewallApp />);
    fireEvent.change(screen.getByLabelText('Application'), { target: { value: 'Dev Server' } });
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '8080' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));
    expect(screen.getByText('Dev Server')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();
    const state = getFirewallState();
    const hasRule = state.profiles[state.activeProfile].some(
      (rule) => rule.app === 'Dev Server' && rule.port === '8080'
    );
    expect(hasRule).toBe(true);
  });

  it('edits an existing rule inline', () => {
    render(<FirewallApp />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const portInput = screen.getByLabelText('Port');
    fireEvent.change(portInput, { target: { value: '8081' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Rule' }));
    expect(screen.getByText('8081')).toBeInTheDocument();
    const state = getFirewallState();
    expect(state.profiles.home.some((rule) => rule.port === '8081')).toBe(true);
    expect(state.profiles.home.some((rule) => rule.port === '80')).toBe(false);
  });

  it('removes a rule and exits edit mode when deleting the selected rule', () => {
    render(<FirewallApp />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getByLabelText('Delete rule for Web Browser on port 80'));
    expect(screen.queryByText('80')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Rule' })).toBeInTheDocument();
    const state = getFirewallState();
    expect(state.profiles.home.some((rule) => rule.port === '80')).toBe(false);
  });
});
