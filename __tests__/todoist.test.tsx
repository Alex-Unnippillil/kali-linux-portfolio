import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Todoist from '../components/apps/todoist';
import 'fake-indexeddb/auto';

// polyfill for Node environments without structuredClone
// @ts-ignore
global.structuredClone = global.structuredClone || ((obj: any) => JSON.parse(JSON.stringify(obj)));

describe('Todoist IndexedDB tasks', () => {
  beforeEach(async () => {
    // reset database before each test
    // @ts-ignore - not in all browsers
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    if (dbs.length) {
      // @ts-ignore
      for (const db of dbs) indexedDB.deleteDatabase(db.name);
    } else {
      indexedDB.deleteDatabase('todoist');
    }
  });

  test('create, toggle, delete offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    render(<Todoist />);
    const input = screen.getByTestId('new-task-title') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'task1' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(await screen.findByText('task1')).toBeInTheDocument();
    const cb = screen.getByRole('checkbox') as HTMLInputElement;
    await act(async () => fireEvent.click(cb));
    await screen.findByRole('checkbox', { checked: true });
    const del = screen.getByTestId(/delete-/);
    await act(async () => fireEvent.click(del));
    await waitFor(() => {
      expect(screen.queryByText('task1')).toBeNull();
    });
  });

  test('persists tasks', async () => {
    const { unmount } = render(<Todoist />);
    const input = screen.getByTestId('new-task-title') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'persist' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(await screen.findByText('persist')).toBeInTheDocument();
    unmount();
    render(<Todoist />);
    expect(await screen.findByText('persist')).toBeInTheDocument();
  });

  test('drag updates column', async () => {
    render(<Todoist />);
    const input = screen.getByTestId('new-task-title') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'dragme' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await screen.findByText('dragme');
    const toggle = screen.getByTestId('toggle-view');
    await act(async () => fireEvent.click(toggle)); // switch to kanban
    const taskEl = screen.getByText('dragme').parentElement as HTMLElement;
    const doneCol = screen.getByText('Done').parentElement as HTMLElement;
    const dataTransfer: any = {
      data: {},
      setData(key: string, val: string) { this.data[key] = val; },
      getData(key: string) { return this.data[key]; }
    };
    await act(async () => {
      fireEvent.dragStart(taskEl, { dataTransfer });
      fireEvent.dragOver(doneCol, { dataTransfer });
      fireEvent.drop(doneCol, { dataTransfer });
    });
    await waitFor(() => {
      expect(doneCol.textContent).toContain('dragme');
    });
  });
});
