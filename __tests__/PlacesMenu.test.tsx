import { fireEvent, render, screen } from '@testing-library/react';
import PlacesMenu, { PlacesMenuItem } from '../components/menu/PlacesMenu';

describe('PlacesMenu keyboard interactions', () => {
  const baseItem: PlacesMenuItem = {
    id: 'home',
    label: 'Home',
    icon: '/themes/Kali/places/user-home.svg',
  };

  test('Enter triggers onSelect and closes the menu', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <PlacesMenu
        heading="Places"
        items={[{ ...baseItem, onSelect }]}
        onClose={onClose}
      />,
    );

    const button = screen.getByRole('button', { name: /home/i });
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('ArrowRight opens the location in a new window', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <PlacesMenu
        heading="Places"
        items={[{ ...baseItem, onSelect }]}
        onClose={onClose}
      />,
    );

    const button = screen.getByRole('button', { name: /home/i });
    fireEvent.keyDown(button, { key: 'ArrowRight' });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ openInNewWindow: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the menu without selecting an item', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <PlacesMenu
        heading="Places"
        items={[{ ...baseItem, onSelect }]}
        onClose={onClose}
      />,
    );

    const button = screen.getByRole('button', { name: /home/i });
    fireEvent.keyDown(button, { key: 'Escape' });

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clicking the backdrop closes the menu', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <PlacesMenu
        heading="Places"
        items={[{ ...baseItem, onSelect }]}
        onClose={onClose}
      />,
    );

    const backdrop = screen.getByTestId('places-menu-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

