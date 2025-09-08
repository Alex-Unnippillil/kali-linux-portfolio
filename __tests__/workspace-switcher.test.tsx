import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkspaceSwitcher from '../components/util-components/WorkspaceSwitcher';

beforeEach(() => {
  window.localStorage.clear();
});

test('cycles workspaces with keyboard controls', () => {
  render(<WorkspaceSwitcher />);
  const ws1 = screen.getByRole('tab', { name: 'Workspace 1' });
  ws1.focus();

  fireEvent.keyDown(ws1, { key: 'ArrowRight' });
  const ws2 = screen.getByRole('tab', { name: 'Workspace 2' });
  expect(ws2).toHaveAttribute('aria-selected', 'true');
  expect(ws2).toHaveFocus();

  fireEvent.keyDown(ws2, { key: 'ArrowRight' });
  const ws3 = screen.getByRole('tab', { name: 'Workspace 3' });
  fireEvent.keyDown(ws3, { key: 'ArrowRight' });
  const ws4 = screen.getByRole('tab', { name: 'Workspace 4' });
  fireEvent.keyDown(ws4, { key: 'ArrowRight' });
  const ws1Again = screen.getByRole('tab', { name: 'Workspace 1' });
  expect(ws1Again).toHaveAttribute('aria-selected', 'true');
  expect(ws1Again).toHaveFocus();

  fireEvent.keyDown(ws1Again, { key: 'ArrowLeft' });
  const ws4Again = screen.getByRole('tab', { name: 'Workspace 4' });
  expect(ws4Again).toHaveAttribute('aria-selected', 'true');
  expect(ws4Again).toHaveFocus();

  fireEvent.keyDown(ws4Again, { key: 'Home' });
  const ws1Home = screen.getByRole('tab', { name: 'Workspace 1' });
  expect(ws1Home).toHaveAttribute('aria-selected', 'true');
  expect(ws1Home).toHaveFocus();

  fireEvent.keyDown(ws1Home, { key: 'End' });
  const ws4End = screen.getByRole('tab', { name: 'Workspace 4' });
  expect(ws4End).toHaveAttribute('aria-selected', 'true');
  expect(ws4End).toHaveFocus();
});

test('persists active workspace via localStorage', async () => {
  const { unmount } = render(<WorkspaceSwitcher />);
  const ws3 = screen.getByRole('tab', { name: 'Workspace 3' });
  fireEvent.click(ws3);
  expect(ws3).toHaveAttribute('aria-selected', 'true');
  unmount();

  render(<WorkspaceSwitcher />);
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: 'Workspace 3' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  );
});
