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
  fireEvent.click(screen.getByRole('button', {name:'Switch to Sticky Notes'}));
  expect(onOpen).toHaveBeenCalledWith('sticky_notes');
  fireEvent.click(screen.getByRole('button', {name:'Browse applications'}));
  expect(onApplications).toHaveBeenCalledTimes(1);
});
test('desktop keeps its existing taskbar', () => {
  Object.defineProperty(window, 'innerWidth', {configurable:true,value:1440});
  render(<MobileTaskbar apps={apps} onOpen={jest.fn()} onApplications={jest.fn()} />);
  expect(screen.queryByRole('navigation', {name:'Phone taskbar'})).toBeNull();
});
