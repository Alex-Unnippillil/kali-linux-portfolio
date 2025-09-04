import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Desktop } from '../components/screen/desktop';

describe('Desktop name bar accessibility', () => {
  test('buttons respond to keyboard activation', async () => {
    const desktop = new Desktop();
    const addSpy = jest.spyOn(desktop, 'addToDesktop').mockImplementation(() => {});
    const setStateSpy = jest.spyOn(desktop, 'setState').mockImplementation(() => {});

    const user = userEvent.setup();
    const { getByRole } = render(desktop.renderNameBar());
    const input = getByRole('textbox');
    await user.type(input, 'new folder');

    const createButton = getByRole('button', { name: /create/i });
    createButton.focus();
    await user.keyboard('{Enter}');
    expect(addSpy).toHaveBeenCalledWith('new folder');

    const cancelButton = getByRole('button', { name: /cancel/i });
    cancelButton.focus();
    await user.keyboard('{Enter}');
    expect(setStateSpy).toHaveBeenCalledWith({ showNameBar: false });
  });
});
