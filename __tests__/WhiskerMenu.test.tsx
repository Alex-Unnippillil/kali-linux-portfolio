import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiskerMenu from '../components/menu/WhiskerMenu';

describe('WhiskerMenu quick actions', () => {
  it('dispatches desktop events and keeps overlay open', async () => {
    const user = userEvent.setup();
    render(<WhiskerMenu />);

    const trigger = screen.getByRole('button', { name: /applications/i });
    await user.click(trigger);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'about');

    const dialog = await screen.findByRole('dialog', { name: /application search/i });

    const openEvents: any[] = [];
    const pinEvents: any[] = [];
    const handleOpen = (event: Event) => {
      openEvents.push((event as CustomEvent).detail);
    };
    const handlePin = (event: Event) => {
      pinEvents.push((event as CustomEvent).detail);
    };

    window.addEventListener('open-app', handleOpen as EventListener);
    window.addEventListener('desktop-pin-app', handlePin as EventListener);

    try {
      const openButton = await screen.findByRole('button', { name: /open about alex/i });
      const openNewButton = await screen.findByRole('button', {
        name: /open new window for about alex/i,
      });
      const pinButton = await screen.findByRole('button', { name: /pin about alex/i });

      await user.click(openButton);
      await user.click(openNewButton);
      await user.click(pinButton);

      expect(openEvents).toEqual([
        { id: 'about' },
        { id: 'about', spawnNew: true },
      ]);
      expect(pinEvents).toEqual([{ id: 'about' }]);
      expect(searchInput).toHaveFocus();
      expect(dialog).toBeVisible();
      expect(screen.getByPlaceholderText(/search/i)).toHaveValue('about');
    } finally {
      window.removeEventListener('open-app', handleOpen as EventListener);
      window.removeEventListener('desktop-pin-app', handlePin as EventListener);
    }
  });
});
