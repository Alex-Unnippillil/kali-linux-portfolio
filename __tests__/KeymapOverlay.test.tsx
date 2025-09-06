import { render, screen, fireEvent, within } from '@testing-library/react';
import KeymapOverlay from '../apps/settings/components/KeymapOverlay';

describe('KeymapOverlay conflict handling', () => {
  beforeEach(() => {
    window.localStorage.removeItem('keymap');
  });

  it('prompts to reassign when choosing an existing shortcut', () => {
    render(<KeymapOverlay open={true} onClose={() => {}} />);

    const openSettingsItem = screen.getByText('Open settings').closest('li')!;
    fireEvent.click(within(openSettingsItem).getByRole('button'));
    fireEvent.keyDown(window, { key: 'Tab', altKey: true });

    expect(
      screen.getByRole('button', { name: /Reassign Window switcher/ }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Reassign Window switcher/ }),
    );
    fireEvent.keyDown(window, { key: 'w', altKey: true });

    expect(
      screen.queryByRole('button', { name: /Reassign Window switcher/ }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByText('Open settings').closest('li')!).getByText(
        'Alt+Tab',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText('Window switcher').closest('li')!).getByText(
        'Alt+W',
      ),
    ).toBeInTheDocument();
  });
});

