import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BadgeControls from '@/src/pwa/BadgeControls';

describe('BadgeControls', () => {
  test('falls back to document title when app badge unsupported', async () => {
    delete (navigator as any).setAppBadge;
    delete (navigator as any).clearAppBadge;
    document.title = 'Orig';

    render(<BadgeControls />);

    const dotBtn = screen.getByRole('button', { name: /set app badge to dot/i });
    await userEvent.click(dotBtn);
    expect(document.title).toBe('• Orig');

    const numBtn = screen.getByRole('button', { name: /set app badge to number/i });
    await userEvent.click(numBtn);
    expect(document.title).toBe('(5) Orig');

    const clearBtn = screen.getByRole('button', { name: /clear app badge/i });
    await userEvent.click(clearBtn);
    expect(document.title).toBe('Orig');
  });

  test('uses native app badge API and keyboard handlers', () => {
    const setAppBadge = jest.fn().mockResolvedValue(undefined);
    const clearAppBadge = jest.fn().mockResolvedValue(undefined);
    (navigator as any).setAppBadge = setAppBadge;
    (navigator as any).clearAppBadge = clearAppBadge;

    render(<BadgeControls />);

    const numBtn = screen.getByRole('button', { name: /set app badge to number/i });
    fireEvent.keyDown(numBtn, { key: 'Enter' });
    expect(setAppBadge).toHaveBeenCalledWith(5);

    const clearBtn = screen.getByRole('button', { name: /clear app badge/i });
    fireEvent.keyDown(clearBtn, { key: ' ' });
    expect(clearAppBadge).toHaveBeenCalled();
  });
});

