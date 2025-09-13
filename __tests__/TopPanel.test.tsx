import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '../components/screen/navbar';

describe('TopPanel', () => {
  test('renders clock', () => {
    render(<Navbar />);
    // Clock renders current time like "Mon Jan 1 12:34 AM"
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  test('toggles quick settings menu', async () => {
    const user = userEvent.setup();
    render(<Navbar />);
    const toggle = screen.getByRole('button', { name: /system status/i });
    const menu = screen.getByText('Theme').closest('div.absolute') as HTMLElement;

    expect(menu.classList.contains('hidden')).toBe(true);

    await user.click(toggle);
    expect(menu.classList.contains('hidden')).toBe(false);

    await user.click(toggle);
    expect(menu.classList.contains('hidden')).toBe(true);
  });
});
