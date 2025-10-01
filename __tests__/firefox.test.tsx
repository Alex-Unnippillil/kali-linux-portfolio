import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Firefox from '../components/apps/firefox';

describe('Firefox app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the default address with a simulation fallback', () => {
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/docs/');
    expect(screen.getByRole('heading', { name: 'Kali Linux Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open kali.org\/docs/i })).toHaveAttribute(
      'href',
      'https://www.kali.org/docs/'
    );
  });

  it('navigates to entered urls', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const input = screen.getByLabelText('Address');
    await user.clear(input);
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    const frame = await screen.findByTitle('Firefox');
    expect(frame).toHaveAttribute('src', 'https://example.com/');
    expect(localStorage.getItem('firefox:last-url')).toBe('https://example.com/');
  });

  it('opens bookmarks when clicked and shows their simulations', async () => {
    const user = userEvent.setup();
    render(<Firefox />);
    const bookmark = await screen.findByRole('button', { name: 'Kali NetHunter' });
    await user.click(bookmark);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Kali NetHunter & Downloads' })).toBeInTheDocument()
    );
    expect(localStorage.getItem('firefox:last-url')).toBe('https://www.kali.org/get-kali/#kali-platforms');
  });

  it('persists bookmark changes when renaming and deleting entries', async () => {
    const user = userEvent.setup();
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('OffSec HQ');

    render(<Firefox />);

    const renameButton = await screen.findByRole('button', { name: 'Rename OffSec' });
    await user.click(renameButton);

    await waitFor(() => expect(screen.getByRole('button', { name: 'OffSec HQ' })).toBeInTheDocument());

    const storedAfterRename = JSON.parse(localStorage.getItem('firefox:bookmarks') ?? '[]');
    expect(storedAfterRename.some((entry: { label?: string }) => entry.label === 'OffSec HQ')).toBe(true);

    promptSpy.mockRestore();

    const deleteButton = await screen.findByRole('button', { name: 'Delete Exploit-DB' });
    await user.click(deleteButton);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Exploit-DB' })).not.toBeInTheDocument());

    const storedAfterDelete = JSON.parse(localStorage.getItem('firefox:bookmarks') ?? '[]');
    expect(storedAfterDelete.some((entry: { label?: string }) => entry.label === 'Exploit-DB')).toBe(false);
  });

  it('creates folders and marks them as expandable lists', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'prompt').mockReturnValue('Resources');

    render(<Firefox />);

    const newFolderButton = await screen.findByRole('button', { name: 'New Folder' });
    await user.click(newFolderButton);

    const folderToggle = await screen.findByRole('button', { name: 'Resources' });
    expect(folderToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Empty folder')).toBeInTheDocument();
  });

  it('reorders bookmarks with drag and drop and persists the new order', async () => {
    render(<Firefox />);

    const offsecButton = await screen.findByRole('button', { name: 'OffSec' });
    const draggable = offsecButton.closest('li');
    expect(draggable).not.toBeNull();

    const dropZones = screen.getAllByTestId('bookmark-dropzone');
    const lastDropZone = dropZones[dropZones.length - 1];

    const dataTransfer = {
      dropEffect: 'move',
      effectAllowed: 'move',
      files: [],
      items: [],
      types: [],
      setData: jest.fn(),
      getData: jest.fn(),
      clearData: jest.fn(),
      setDragImage: jest.fn(),
    } as unknown as DataTransfer;

    fireEvent.dragStart(draggable as HTMLElement, { dataTransfer });
    fireEvent.dragEnter(lastDropZone, { dataTransfer });
    fireEvent.dragOver(lastDropZone, { dataTransfer });
    fireEvent.drop(lastDropZone, { dataTransfer });
    fireEvent.dragEnd(draggable as HTMLElement, { dataTransfer });

    const stored = JSON.parse(localStorage.getItem('firefox:bookmarks') ?? '[]');
    const labels = stored.map((entry: { label?: string }) => entry.label);
    expect(labels[labels.length - 1]).toBe('OffSec');
  });
});
