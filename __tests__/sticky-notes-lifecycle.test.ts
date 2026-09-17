import { fireEvent, waitFor, within } from '@testing-library/dom';
import { mountStickyNotes } from '../apps/sticky_notes/main';
import { getDb } from '../utils/safeIDB';

let cleanup: (() => void) | undefined;
const fixture = () => {
  const root = document.createElement('div');
  root.innerHTML = '<button id="add-note">Add Note</button><button id="undo-note" hidden>Undo delete</button><p id="notes-status" role="status"></p><div id="notes"></div>';
  document.body.append(root);
  cleanup = mountStickyNotes(root);
  return root;
};
beforeEach(async () => {
  localStorage.clear();
  const db = await getDb('stickyNotes', 1, { upgrade(db) { db.createObjectStore('notes', { keyPath: 'id' }); } });
  await db?.clear('notes'); db?.close();
});
afterEach(() => { cleanup?.(); document.body.replaceChildren(); });

test('notes save as text, reopen, and recover from delete without duplicate listeners', async () => {
  let root = fixture();
  await waitFor(() => expect(within(root).getByText('Add Note')).toBeEnabled());
  fireEvent.click(within(root).getByText('Add Note'));
  const text = within(root).getByRole('textbox', { name: 'Note text' });
  // Add button used to pass its MouseEvent as note content.
  expect(text).toHaveValue('');
  fireEvent.input(text, { target: { value: 'Remember the mobile review' } });
  await waitFor(() => expect(within(root).getByRole('status')).toHaveTextContent('Saved on this device'));
  cleanup?.(); root.remove();
  root = fixture();
  await waitFor(() => expect(within(root).getByRole('textbox', { name: 'Note text' })).toHaveValue('Remember the mobile review'));
  fireEvent.click(within(root).getByRole('button', { name: 'Delete note' }));
  expect(within(root).queryByRole('textbox')).toBeNull();
  fireEvent.click(within(root).getByText('Undo delete'));
  expect(within(root).getByRole('textbox')).toHaveValue('Remember the mobile review');
  fireEvent.click(within(root).getByText('Add Note'));
  expect(within(root).getAllByRole('textbox')).toHaveLength(2);
});

test('unmounting before storage resolves cannot attach notes to another window', async () => {
  const root = fixture(); cleanup?.(); root.remove();
  const current = fixture();
  await waitFor(() => expect(within(current).getByText('Add Note')).toBeEnabled());
  fireEvent.click(within(current).getByText('Add Note'));
  expect(within(current).getAllByRole('textbox')).toHaveLength(1);
});
