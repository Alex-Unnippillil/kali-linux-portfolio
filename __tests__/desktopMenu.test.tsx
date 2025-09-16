import { render } from '@testing-library/react';
import DesktopMenu from '../components/context-menus/desktop-menu';

describe('Desktop menu', () => {
  it('renders Kali style entries', () => {
    const { getByRole } = render(
      <DesktopMenu
        active={true}
        openApp={jest.fn()}
        addNewFolder={jest.fn()}
        openShortcutSelector={jest.fn()}
        showAllApps={jest.fn()}
      />
    );
    expect(getByRole('menuitem', { name: /Create Folder/i })).toBeInTheDocument();
    expect(getByRole('menuitem', { name: /Applications/i })).toBeInTheDocument();
  });
});
