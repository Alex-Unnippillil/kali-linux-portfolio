import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import apps from '../apps.config';
import Trash from '../apps/trash';
import useTrashState from '../apps/trash/state';

jest.mock('next/dynamic', () => () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));
jest.mock('../hooks/usePersistentState', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (key: string, initial: any) => {
      const [value, setValue] = React.useState(initial);
      return [value, setValue];
    },
  };
});

jest.mock('../apps/trash/state');

const mockUseTrashState = useTrashState as jest.MockedFunction<typeof useTrashState>;

const TRASH_ICON_EMPTY = '/themes/Yaru/status/user-trash-symbolic.svg';
const TRASH_ICON_FULL = '/themes/Yaru/status/user-trash-full-symbolic.svg';

describe('trash-change event integration', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseTrashState.mockReset();
  });

  it('updates the desktop trash icon when the trash-change event fires', () => {
    const desktop = new Desktop({});
    const forceUpdateSpy = jest.spyOn(desktop, 'forceUpdate').mockImplementation(() => {});
    window.addEventListener('trash-change', desktop.updateTrashIcon);
    const trashConfig = apps.find(app => app.id === 'trash');
    expect(trashConfig).toBeDefined();
    if (!trashConfig) throw new Error('Trash config missing');

    trashConfig.icon = TRASH_ICON_EMPTY;
    localStorage.setItem('window-trash', JSON.stringify([{ id: '1' }]));
    window.dispatchEvent(new Event('trash-change'));
    expect(trashConfig.icon).toBe(TRASH_ICON_FULL);
    expect(forceUpdateSpy).toHaveBeenCalled();

    forceUpdateSpy.mockClear();
    localStorage.setItem('window-trash', JSON.stringify([]));
    window.dispatchEvent(new Event('trash-change'));
    expect(trashConfig.icon).toBe(TRASH_ICON_EMPTY);
    expect(forceUpdateSpy).toHaveBeenCalled();

    window.removeEventListener('trash-change', desktop.updateTrashIcon);
    forceUpdateSpy.mockRestore();
  });

  it('dispatches the trash-change event from the Trash app actions', () => {
    const setItems = jest.fn();
    const pushHistory = jest.fn();
    const restoreFromHistory = jest.fn();
    const restoreAllFromHistory = jest.fn();
    const item = { id: 'terminal', title: 'Terminal', closedAt: Date.now() };
    mockUseTrashState.mockReturnValue({
      items: [item],
      setItems,
      history: [],
      pushHistory,
      restoreFromHistory,
      restoreAllFromHistory,
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    render(<Trash openApp={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /restore all/i }));

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'trash-change' }));

    confirmSpy.mockRestore();
    dispatchSpy.mockRestore();
  });
});
