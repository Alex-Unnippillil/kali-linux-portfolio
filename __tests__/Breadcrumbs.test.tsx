import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Breadcrumbs from '../components/ui/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('allows inline renaming of the current folder', async () => {
    const onNavigate = jest.fn();
    const onRename = jest.fn();
    const user = userEvent.setup();

    render(
      <Breadcrumbs
        path={[{ name: '/' }, { name: 'home' }, { name: 'docs' }]}
        onNavigate={onNavigate}
        onRename={onRename}
      />
    );

    await user.dblClick(screen.getByRole('button', { name: 'docs' }));

    const input = screen.getByLabelText('Rename folder');
    expect(input).toHaveValue('docs');

    await user.clear(input);
    await user.type(input, 'reports{enter}');

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith('reports');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps navigation working after a rename', async () => {
    const onNavigate = jest.fn();
    const onRename = jest.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Breadcrumbs
        path={[{ name: '/' }, { name: 'home' }, { name: 'docs' }]}
        onNavigate={onNavigate}
        onRename={onRename}
      />
    );

    await user.dblClick(screen.getByRole('button', { name: 'docs' }));
    const input = screen.getByLabelText('Rename folder');
    await user.clear(input);
    await user.type(input, 'reports{enter}');

    expect(onRename).toHaveBeenCalledWith('reports');

    rerender(
      <Breadcrumbs
        path={[{ name: '/' }, { name: 'home' }, { name: 'reports' }]}
        onNavigate={onNavigate}
        onRename={onRename}
      />
    );

    await user.click(screen.getByRole('button', { name: 'home' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
