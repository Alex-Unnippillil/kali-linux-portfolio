import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('next/image', () => (props: any) => <img {...props} alt={props.alt} />);

jest.mock('../apps.config.js', () => ({
  __esModule: true,
  default: [
    { id: 'calc', title: 'Calculator', icon: '' },
    { id: 'calendar', title: 'Calendar', icon: '' },
    { id: 'camera', title: 'Camera', icon: '' },
  ],
  utilities: [],
  games: [],
}));

describe('WhiskerMenu', () => {
  it('filters apps using fuzzy search', () => {
    const { getByRole, getByLabelText, queryByRole } = render(<WhiskerMenu />);
    fireEvent.click(getByRole('button', { name: /applications/i }));
    fireEvent.change(getByLabelText(/search applications/i), {
      target: { value: 'cmr' },
    });
    expect(getByRole('menuitem', { name: /camera/i })).toBeInTheDocument();
    expect(queryByRole('menuitem', { name: /calculator/i })).toBeNull();
  });

  it('supports keyboard navigation', () => {
    const dispatch = jest.spyOn(window, 'dispatchEvent');
    const { getByRole } = render(<WhiskerMenu />);
    fireEvent.click(getByRole('button', { name: /applications/i }));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'calendar' }),
    );
  });
});
