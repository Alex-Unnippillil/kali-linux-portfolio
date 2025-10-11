import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import MimikatzPage from '../apps/mimikatz';

describe('MimikatzPage layout', () => {
  it('renders hero and explainer sections after confirmation', () => {
    const { getByRole, container } = render(<MimikatzPage />);

    // Dismiss the warning overlay so the main layout is visible.
    fireEvent.click(getByRole('button', { name: /proceed/i }));

    expect(container).toMatchSnapshot();
  });
});
