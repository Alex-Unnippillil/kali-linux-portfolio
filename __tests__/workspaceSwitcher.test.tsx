import { render, fireEvent } from '@testing-library/react';
import WorkspaceSwitcher from '../components/screen/workspace-switcher';

describe('WorkspaceSwitcher overlay', () => {
  const workspaces = [
    { id: 0, name: 'One' },
    { id: 1, name: 'Two' },
  ];

  test('renders labels and handles selection', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        active={0}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.click(getByText('Two'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  test('closes on Escape key', () => {
    const onClose = jest.fn();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        active={0}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

