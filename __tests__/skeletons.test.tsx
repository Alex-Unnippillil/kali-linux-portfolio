import { render, screen } from '@testing-library/react';
import BetaBadgeSkeleton from '../components/shells/BetaBadgeSkeleton';
import DesktopShellSkeleton from '../components/shells/DesktopShellSkeleton';
import InstallButtonSkeleton from '../components/shells/InstallButtonSkeleton';

describe('streaming skeleton shells', () => {
  test('desktop skeleton preserves window-area anchor for skip links', () => {
    const { container } = render(<DesktopShellSkeleton />);
    expect(container.querySelector('#window-area')).not.toBeNull();
  });

  test('beta badge skeleton renders a muted badge', () => {
    render(<BetaBadgeSkeleton />);
    const badge = screen.getByText(/beta/i);
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });

  test('install button skeleton reserves call-to-action space', () => {
    render(<InstallButtonSkeleton />);
    const install = screen.getByText(/install/i);
    expect(install).toHaveAttribute('aria-hidden', 'true');
  });
});
