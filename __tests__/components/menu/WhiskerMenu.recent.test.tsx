import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('../../../apps/registry-core', () => ({
  __esModule: true,
  default: [
    { id: 'wireshark', title: 'Wireshark', icon: '/wireshark.svg' },
    { id: 'calculator', title: 'Calculator', icon: '/calculator.svg' },
    { id: 'metasploit', title: 'Metasploit', icon: '/metasploit.svg' },
  ],
  loadFullRegistry: jest.fn().mockResolvedValue({
    apps: [
      { id: 'wireshark', title: 'Wireshark', icon: '/wireshark.svg' },
      { id: 'calculator', title: 'Calculator', icon: '/calculator.svg' },
      { id: 'metasploit', title: 'Metasploit', icon: '/metasploit.svg' },
    ],
    games: [],
    utilities: [],
    gameDefaults: {},
  }),
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
