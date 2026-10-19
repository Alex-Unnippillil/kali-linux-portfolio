import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('../../../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'wireshark', title: 'Wireshark', icon: '/wireshark.svg' },
    { id: 'calculator', title: 'Calculator', icon: '/calculator.svg' },
    { id: 'metasploit', title: 'Metasploit', icon: '/metasploit.svg', favourite: true },
    { id: 'unavailable', title: 'Unavailable', icon: '/unavailable.svg', disabled: true, favourite: true },
  ],
}));

import WhiskerMenu from '../../../components/menu/WhiskerMenu';
import { readRecentAppIds } from '../../../utils/recentStorage';

jest.mock('../../../utils/recentStorage', () => {
  const actual = jest.requireActual('../../../utils/recentStorage');
  return {
    ...actual,
    readRecentAppIds: jest.fn(),
  };
});

describe('WhiskerMenu recent applications', () => {
  const mockedReadRecentAppIds = readRecentAppIds as jest.MockedFunction<typeof readRecentAppIds>;

  beforeAll(() => {
    // @ts-expect-error allow assigning polyfill in tests
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      callback(now);
      return 0;
    };
  });

  beforeEach(() => {
    mockedReadRecentAppIds.mockReset();
  });

  it('populates the Recent category after fetching stored ids when opened', async () => {
    mockedReadRecentAppIds
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['wireshark', 'calculator']);

    render(<WhiskerMenu />);

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    await waitFor(() => {
      expect(mockedReadRecentAppIds).toHaveBeenCalledTimes(2);
    });

    const menu = await screen.findByTestId('whisker-menu-dropdown');
    const recentOption = within(menu).getByRole('option', { name: /Recent/i });
    fireEvent.click(recentOption);

    await waitFor(() => {
      const items = within(menu).getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    expect(within(menu).getByText('Wireshark')).toBeInTheDocument();
    expect(within(menu).getByText('Calculator')).toBeInTheDocument();
    expect(within(menu).queryByText('Metasploit')).not.toBeInTheDocument();
  });
});

describe('WhiskerMenu keyboard ownership', () => {
  const mockedReadRecentAppIds = readRecentAppIds as jest.MockedFunction<typeof readRecentAppIds>;
  let onOpen: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
      window.setTimeout(() => callback(0), 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle =>
      window.clearTimeout(handle));
    window.localStorage.removeItem('whisker-menu-category');
    mockedReadRecentAppIds.mockReset().mockReturnValue([]);
    onOpen = jest.fn();
    window.addEventListener('open-app', onOpen);
  });

  afterEach(() => {
    act(() => { jest.advanceTimersByTime(200); });
    cleanup();
    window.removeEventListener('open-app', onOpen);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const openMenu = () => {
    render(<WhiskerMenu />);
    const trigger = screen.getByRole('button', { name: 'Applications menu' });
    fireEvent.click(trigger);
    const menu = screen.getByTestId('whisker-menu-dropdown');
    const search = within(menu).getByRole('searchbox', { name: 'Search applications' });
    return { trigger, menu, search };
  };

  it.each([
    { label: 'composition', signal: { isComposing: true } },
    { label: 'legacy IME confirmation', signal: { keyCode: 229 } },
  ])('leaves $label keys with search and preserves the highlighted result', ({ signal }) => {
    const { trigger, search } = openMenu();
    for (const key of ['Enter', 'Escape', 'ArrowDown', 'ArrowUp']) {
      expect(fireEvent.keyDown(search, { key, ...signal })).toBe(true);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(onOpen).not.toHaveBeenCalled();
    }
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].detail).toBe('calculator');
  });

  it.each([
    { label: 'composition', signal: { isComposing: true } },
    { label: 'legacy IME confirmation', signal: { keyCode: 229 } },
  ])('leaves $label navigation with the category control', ({ signal }) => {
    const { menu, trigger } = openMenu();
    const favorites = within(menu).getByRole('option', { name: 'Favorites', exact: true });
    act(() => favorites.focus());
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
      expect(fireEvent.keyDown(favorites, { key, ...signal })).toBe(true);
    }
    expect(within(menu).getByRole('option', { name: 'All Applications', exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it.each(['ctrlKey', 'metaKey', 'altKey', 'shiftKey'])(
    'does not consume search editing chords with %s', modifier => {
      const { search, trigger } = openMenu();
      expect(fireEvent.keyDown(search, { key: 'ArrowDown', [modifier]: true })).toBe(true);
      expect(fireEvent.keyDown(search, { key: 'Enter', [modifier]: true })).toBe(true);
      expect(onOpen).not.toHaveBeenCalled();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      fireEvent.keyDown(search, { key: 'Enter' });
      expect(onOpen.mock.calls[0][0].detail).toBe('calculator');
    },
  );

  it.each(['Wireshark', 'Open Metasploit'])(
    'leaves native Enter activation to the focused %s button', name => {
      const { menu } = openMenu();
      const button = within(menu).getByRole('button', { name, exact: true });
      act(() => button.focus());
      expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(true);
      expect(onOpen).not.toHaveBeenCalled();
      // jsdom does not synthesize native keyboard clicks; browser tests do.
      fireEvent.click(button);
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onOpen.mock.calls[0][0].detail).toBe(name === 'Wireshark' ? 'wireshark' : 'metasploit');
    },
  );

  it('starts category arrows from the focused category and leaves Enter to its button', () => {
    const { menu } = openMenu();
    const favorites = within(menu).getByRole('option', { name: 'Favorites', exact: true });
    act(() => favorites.focus());
    expect(fireEvent.keyDown(favorites, { key: 'Enter' })).toBe(true);
    fireEvent.click(favorites);
    expect(favorites).toHaveAttribute('aria-selected', 'true');
    const recent = within(menu).getByRole('option', { name: 'Recent', exact: true });
    act(() => recent.focus());
    fireEvent.keyDown(recent, { key: 'ArrowDown' });
    const information = within(menu).getByRole('option', { name: 'Information Gathering', exact: true });
    expect(information).toHaveAttribute('aria-selected', 'true');
    expect(information).toHaveFocus();
    fireEvent.keyDown(information, { key: 'ArrowUp' });
    expect(recent).toHaveAttribute('aria-selected', 'true');
    expect(recent).toHaveFocus();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('closes from the category sidebar and restores trigger focus', () => {
    const { menu, trigger } = openMenu();
    const category = within(menu).getByRole('option', { name: 'Favorites', exact: true });
    act(() => category.focus());
    expect(fireEvent.keyDown(category, { key: 'Escape' })).toBe(false);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    act(() => { jest.advanceTimersByTime(200); });
    expect(screen.queryByTestId('whisker-menu-dropdown')).not.toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops consuming application keys during the exit animation', () => {
    const { search, menu, trigger } = openMenu();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(menu).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    for (const key of ['Enter', 'ArrowDown', 'ArrowUp', 'Escape']) {
      expect(fireEvent.keyDown(document, { key })).toBe(true);
    }
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('cannot launch disabled results or disabled favorites', () => {
    const { search, menu, trigger } = openMenu();
    fireEvent.change(search, { target: { value: 'Unavailable' } });
    const result = within(menu).getByRole('button', { name: 'Unavailable', exact: true });
    const favorite = within(menu).getByRole('button', { name: 'Open Unavailable', exact: true });
    expect(result).toBeDisabled();
    expect(favorite).toBeDisabled();
    fireEvent.keyDown(search, { key: 'Enter' });
    fireEvent.click(result);
    fireEvent.click(favorite);
    expect(onOpen).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not toggle repeatedly when the launcher shortcut is held', () => {
    const { trigger } = openMenu();
    fireEvent.keyDown(window, { key: 'F1', altKey: true, repeat: true });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'F1', altKey: true });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    act(() => { jest.advanceTimersByTime(200); });
    fireEvent.keyDown(window, { key: 'F1', altKey: true, repeat: true });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('ignores repeated Enter but retains ordinary search navigation', () => {
    const { search } = openMenu();
    fireEvent.keyDown(search, { key: 'Enter', repeat: true });
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].detail).toBe('metasploit');
  });

  it('keeps an empty search safe and recovers when the query changes', () => {
    const { search, trigger } = openMenu();
    fireEvent.change(search, { target: { value: 'no matching app' } });
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) fireEvent.keyDown(search, { key });
    expect(onOpen).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(search, { target: { value: 'Calculator' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onOpen.mock.calls[0][0].detail).toBe('calculator');
  });
});
