import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OpenWithDialog, {
  type OpenWithOption,
} from '../components/ui/OpenWithDialog';
import {
  APP_SUGGESTIONS_STORAGE_KEY,
  clearHistory,
  recordOpen,
} from '../utils/analytics/openHistory';

describe('OpenWithDialog', () => {
  const options: OpenWithOption[] = [
    { id: 'gedit', name: 'Text Editor', description: 'Plain text editor' },
    { id: 'code', name: 'Code Studio', description: 'Developer IDE' },
    { id: 'viewer', name: 'Image Viewer' },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    clearHistory();
  });

  test('renders last used and popular sections with explanations', async () => {
    const now = Date.now();
    recordOpen('text/plain', 'gedit', now - 60_000);
    recordOpen('text/plain', 'code', now - 30_000);
    recordOpen('text/plain', 'code', now - 5_000);

    render(
      <OpenWithDialog
        isOpen
        type="text/plain"
        options={options}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Last used/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Recently used/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Popular for this type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Do not suggest Text Editor/i })).toBeInTheDocument();
  });

  test('do not suggest removes the app from recommendations', async () => {
    const now = Date.now();
    recordOpen('text/plain', 'gedit', now - 1_000);
    render(
      <OpenWithDialog
        isOpen
        type="text/plain"
        options={options}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const dismissButton = await screen.findByRole('button', {
      name: /Do not suggest Text Editor/i,
    });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Do not suggest Text Editor/i }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Hidden from suggestions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Allow again/i })).toBeInTheDocument();
  });

  test('honours disabled suggestions flag', async () => {
    window.localStorage.setItem(APP_SUGGESTIONS_STORAGE_KEY, 'false');
    render(
      <OpenWithDialog
        isOpen
        type="text/plain"
        options={options}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const disabledMessage = await screen.findByText(
      /App suggestions are disabled in Privacy settings/i,
    );
    expect(disabledMessage).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Last used/i }),
    ).not.toBeInTheDocument();
  });
});
