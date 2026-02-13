import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickSettings from '../components/ui/QuickSettings';

describe('StatusCluster', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('toggles volume setting', async () => {
    const user = userEvent.setup();
    render(<QuickSettings open={true} />);
    const [soundToggle] = screen.getAllByRole('checkbox');
    expect(soundToggle).toBeChecked();
    await user.click(soundToggle);
    expect(soundToggle).not.toBeChecked();
    expect(JSON.parse(window.localStorage.getItem('qs-sound') || 'true')).toBe(false);

    render(<QuickSettings open={true} />);
    const [persisted] = screen.getAllByRole('checkbox');
    expect(persisted).not.toBeChecked();
  });
});
