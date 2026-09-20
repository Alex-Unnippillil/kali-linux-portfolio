import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileTaskbar from '../components/desktop/MobileTaskbar';
const apps = [{id:'calculator', title:'Calculator', isFocused:true}, {id:'sticky_notes',title:'Sticky Notes',isMinimized:true}];
const width = innerWidth;
afterEach(() => { Object.defineProperty(window, 'innerWidth', {configurable:true,value:width}); });
test('phone task switching delegates to the desktop manager, including minimized apps', () => {
  Object.defineProperty(window, 'innerWidth', {configurable:true,value:390});
  const onOpen=jest.fn(), onApplications=jest.fn();
  render(<MobileTaskbar apps={apps} onOpen={onOpen} onApplications={onApplications} />);
  expect(screen.getByRole('button', {name:'Switch to Calculator'})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button', {name:'Restore Sticky Notes'}));
  expect(onOpen).toHaveBeenCalledWith('sticky_notes');
  fireEvent.click(screen.getByRole('button', {name:'Browse applications'}));
  expect(onApplications).toHaveBeenCalledTimes(1);
});
test('desktop keeps its existing taskbar', () => {
  Object.defineProperty(window, 'innerWidth', {configurable:true,value:1440});
  render(<MobileTaskbar apps={apps} onOpen={jest.fn()} onApplications={jest.fn()} />);
  expect(screen.queryByRole('navigation', {name:'Phone taskbar'})).toBeNull();
});

test('phone taskbar uses the shared toggle action and accurately labels minimized windows', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  const onOpen = jest.fn(), onToggle = jest.fn();
  render(<MobileTaskbar apps={apps} onOpen={onOpen} onToggle={onToggle} onApplications={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Minimize Calculator' }));
  fireEvent.click(screen.getByRole('button', { name: 'Restore Sticky Notes' }));
  expect(onToggle.mock.calls).toEqual([['calculator'], ['sticky_notes']]);
  expect(onOpen).not.toHaveBeenCalled();
});
