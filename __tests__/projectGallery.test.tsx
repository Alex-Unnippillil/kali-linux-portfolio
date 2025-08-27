import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectGallery from '../components/apps/project-gallery';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('ProjectGallery', () => {
  it('search narrows items', async () => {
    render(<ProjectGallery />);
    expect(screen.getAllByTestId('project-card')).toHaveLength(3);
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'Beta');
    expect(screen.getAllByTestId('project-card')).toHaveLength(1);
    expect(screen.getByText(/Beta Build/i)).toBeInTheDocument();
  });

  it('tag selection filters cards', async () => {
    render(<ProjectGallery />);
    await userEvent.click(screen.getByRole('button', { name: 'Vue' }));
    expect(screen.getAllByTestId('project-card')).toHaveLength(1);
    expect(screen.getByText(/Beta Build/i)).toBeInTheDocument();
  });
});
