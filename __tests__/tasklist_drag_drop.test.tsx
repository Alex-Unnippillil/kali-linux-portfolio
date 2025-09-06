import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TaskList from '../components/panel/taskbar/TaskList';

describe('TaskList drag and drop', () => {
  it('highlights drop target and minimizes on drop', () => {
    const minimize = jest.fn();
    const { getByText } = render(
      <TaskList
        apps={[{ id: 'app1', title: 'App One' }]}
        onMinimizeWindow={minimize}
      />
    );

    const target = getByText('App One').parentElement as HTMLElement;
    const dataTransfer = {
      types: ['application/x-window-id'],
      getData: () => 'window-1',
    } as any;

    fireEvent.dragOver(target, { dataTransfer });
    expect(target.classList.contains('outline')).toBe(true);

    fireEvent.drop(target, { dataTransfer });
    expect(minimize).toHaveBeenCalledWith('window-1', 'app1');
  });
});
