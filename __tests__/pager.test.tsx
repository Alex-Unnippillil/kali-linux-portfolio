import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import Pager from '../components/panel/Pager';

beforeEach(() => {
  window.localStorage.clear();
});

test('switches workspace on click', () => {
  const { getByLabelText } = render(<Pager miniatureView={false} />);
  const ws2 = getByLabelText('Workspace 2');
  fireEvent.click(ws2);
  expect(ws2).toHaveAttribute('aria-selected', 'true');
});

test('dragging window moves it to another workspace', () => {
  const { getByTestId } = render(<Pager miniatureView />);
  const ws1 = getByTestId('workspace-0');
  const ws2 = getByTestId('workspace-1');
  const win = within(ws1).getAllByTestId('window-thumbnail')[0];
  expect(within(ws1).getAllByTestId('window-thumbnail')).toHaveLength(2);
  expect(within(ws2).getAllByTestId('window-thumbnail')).toHaveLength(1);
  const data = {
    data: {} as Record<string, string>,
    setData(type: string, val: string) { this.data[type] = val; },
    getData(type: string) { return this.data[type]; },
  };
  fireEvent.dragStart(win, { dataTransfer: data });
  fireEvent.dragOver(ws2, { dataTransfer: data });
  fireEvent.drop(ws2, { dataTransfer: data });
  expect(within(ws1).getAllByTestId('window-thumbnail')).toHaveLength(1);
  expect(within(ws2).getAllByTestId('window-thumbnail')).toHaveLength(2);
});
