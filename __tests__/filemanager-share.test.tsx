import { render, screen, fireEvent, within } from '@testing-library/react';
import Thunar from '../components/apps/FileManager/Thunar';
import ShareSettings from '../apps/settings/shares';

test('sharing folder updates file manager and settings page', () => {
  render(
    <>
      <Thunar />
      <ShareSettings />
    </>
  );

  // open Desktop folder
  fireEvent.click(screen.getAllByText('Desktop')[0]);

  // open share modal
  fireEvent.click(screen.getByRole('button', { name: /share/i }));

  // confirm share inside modal
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /share/i }));

  // navigate back up to root
  fireEvent.click(screen.getByRole('button', { name: /up/i }));

  // shared badge should appear next to Desktop
  expect(screen.getByLabelText('shared')).toBeInTheDocument();

  // settings page should list the shared folder
  expect(screen.getByText('/Desktop')).toBeInTheDocument();

  // unshare from settings page
  fireEvent.click(screen.getByRole('button', { name: /unshare/i }));

  // badge disappears
  expect(screen.queryByLabelText('shared')).toBeNull();
  expect(screen.queryByText('/Desktop')).toBeNull();
});
