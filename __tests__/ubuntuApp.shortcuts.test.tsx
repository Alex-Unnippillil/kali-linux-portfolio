import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UbuntuApp } from '../components/base/ubuntu_app';

describe('UbuntuApp desktop shortcut', () => {
  it('opens app on double click and keyboard activation', async () => {
    const openApp = jest.fn();
    const { getByRole } = render(
      <UbuntuApp id="test" name="Test" icon="/icon.png" openApp={openApp} />
    );
    const button = getByRole('button', { name: /test/i });

    await userEvent.dblClick(button);
    expect(openApp).toHaveBeenCalledWith('test');

    openApp.mockClear();
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(openApp).toHaveBeenCalledWith('test');

    openApp.mockClear();
    button.focus();
    await userEvent.keyboard(' ');
    expect(openApp).toHaveBeenCalledWith('test');
  });
});

