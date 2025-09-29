import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplicationsMenu from '../components/menu/ApplicationsMenu';

jest.mock('next/image', () => {
  return function MockImage(props: React.ComponentProps<'img'>) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  };
});

describe('ApplicationsMenu FND-01 menubar semantics', () => {
  it('supports arrow navigation between menu levels', async () => {
    render(<ApplicationsMenu />);

    const launcher = screen.getByRole('button', { name: /applications/i });
    fireEvent.keyDown(launcher, { key: 'ArrowDown' });

    const informationGathering = await screen.findByRole('menuitem', {
      name: /information gathering/i,
    });

    await waitFor(() => expect(informationGathering).toHaveFocus());

    fireEvent.keyDown(informationGathering, { key: 'ArrowRight' });

    const nmap = await screen.findByRole('menuitem', { name: /nmap nse/i });
    await waitFor(() => expect(nmap).toHaveFocus());

    fireEvent.keyDown(nmap, { key: 'ArrowLeft' });
    await waitFor(() => expect(informationGathering).toHaveFocus());
  });

  it('resets focus to the launcher on escape and selection', async () => {
    const handleSelect = jest.fn();
    render(<ApplicationsMenu onSelect={handleSelect} />);

    const launcher = screen.getByRole('button', { name: /applications/i });
    fireEvent.click(launcher);

    const informationGathering = await screen.findByRole('menuitem', {
      name: /information gathering/i,
    });

    fireEvent.keyDown(informationGathering, { key: 'Escape' });

    await waitFor(() => expect(launcher).toHaveFocus());
    expect(screen.queryByRole('menuitem', { name: /information gathering/i })).toBeNull();

    fireEvent.click(launcher);
    const infoAgain = await screen.findByRole('menuitem', {
      name: /information gathering/i,
    });

    fireEvent.keyDown(infoAgain, { key: 'ArrowRight' });
    const nmap = await screen.findByRole('menuitem', { name: /nmap nse/i });
    fireEvent.keyDown(nmap, { key: 'Enter' });

    await waitFor(() => expect(handleSelect).toHaveBeenCalledWith('information-gathering'));
    await waitFor(() => expect(launcher).toHaveFocus());
  });

  it('supports typeahead to move focus between categories', async () => {
    render(<ApplicationsMenu />);

    const launcher = screen.getByRole('button', { name: /applications/i });
    fireEvent.click(launcher);

    const informationGathering = await screen.findByRole('menuitem', {
      name: /information gathering/i,
    });

    fireEvent.keyDown(informationGathering, { key: 'v' });

    const vulnerability = await screen.findByRole('menuitem', {
      name: /vulnerability analysis/i,
    });

    await waitFor(() => expect(vulnerability).toHaveFocus());
  });
});
