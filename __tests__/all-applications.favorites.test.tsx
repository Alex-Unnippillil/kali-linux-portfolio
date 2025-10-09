import React from 'react';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllApplications from '../components/screen/all-applications';

jest.mock('next/image', () => (props) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={props.alt} {...props} />;
});

const APPS = [
  { id: 'terminal', title: 'Terminal', icon: './icons/terminal.png' },
  { id: 'nmap', title: 'Nmap', icon: './icons/nmap.png' },
  { id: 'burpsuite', title: 'Burp Suite', icon: './icons/burpsuite.png' },
];

const renderAllApps = () =>
  render(
    <AllApplications
      apps={APPS}
      games={[]}
      openApp={jest.fn()}
    />
  );

describe('AllApplications favorites ordering', () => {
  const FAVORITES_KEY = 'launcherFavorites';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  const getFavoriteIds = (container: HTMLElement) =>
    Array.from(
      container
        .querySelector('[aria-label="Favorite applications"]')
        ?.querySelectorAll('li') || []
    ).map((li) => li.getAttribute('data-app-id'));

  it('persists manual favorite reordering', async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['terminal', 'nmap', 'burpsuite']));
    const user = userEvent.setup();
    const { getByRole, container, unmount } = renderAllApps();

    expect(getFavoriteIds(container)).toEqual(['terminal', 'nmap', 'burpsuite']);

    await user.click(getByRole('button', { name: 'Move Terminal down' }));

    expect(localStorage.getItem(FAVORITES_KEY)).toBe(
      JSON.stringify(['nmap', 'terminal', 'burpsuite'])
    );
    expect(getFavoriteIds(container)).toEqual(['nmap', 'terminal', 'burpsuite']);

    unmount();

    const { container: rerendered } = renderAllApps();
    expect(getFavoriteIds(rerendered)).toEqual(['nmap', 'terminal', 'burpsuite']);
  });

  it('keeps existing order when toggling favorites', async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['terminal', 'nmap']));
    const user = userEvent.setup();
    const { getByLabelText, container } = renderAllApps();

    expect(getFavoriteIds(container)).toEqual(['terminal', 'nmap']);

    await user.click(getByLabelText('Add Burp Suite to favorites'));
    expect(localStorage.getItem(FAVORITES_KEY)).toBe(
      JSON.stringify(['terminal', 'nmap', 'burpsuite'])
    );
    expect(getFavoriteIds(container)).toEqual(['terminal', 'nmap', 'burpsuite']);

    await user.click(getByLabelText('Remove Nmap from favorites'));
    expect(localStorage.getItem(FAVORITES_KEY)).toBe(
      JSON.stringify(['terminal', 'burpsuite'])
    );
    expect(getFavoriteIds(container)).toEqual(['terminal', 'burpsuite']);

    await user.click(getByLabelText('Add Nmap to favorites'));
    expect(localStorage.getItem(FAVORITES_KEY)).toBe(
      JSON.stringify(['terminal', 'burpsuite', 'nmap'])
    );
    expect(getFavoriteIds(container)).toEqual(['terminal', 'burpsuite', 'nmap']);
  });
});

