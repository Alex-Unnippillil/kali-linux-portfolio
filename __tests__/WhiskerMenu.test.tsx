import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiskerMenu from '../components/menu/WhiskerMenu';

describe('WhiskerMenu', () => {
  test('keyboard navigation and launching', async () => {
    const user = userEvent.setup();
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(<WhiskerMenu />);

    await user.click(screen.getByRole('button', { name: /applications/i }));
    await screen.findByPlaceholderText(/search/i);

    const appButtons = screen
      .getAllByRole('button')
      .filter((b) => b.dataset.appId);
    const secondId = appButtons[1].dataset.appId!;

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'open-app', detail: secondId })
    );
  });
});
