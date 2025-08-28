import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';
import { jsx as _jsx } from "react/jsx-runtime";
jest.mock('react-ga4', () => ({
  event: jest.fn()
}));
describe('ProjectGallery', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve([{
        id: 1,
        name: 'Repo1',
        description: 'desc1',
        language: 'JS',
        homepage: '',
        html_url: 'url1'
      }, {
        id: 2,
        name: 'Repo2',
        description: 'desc2',
        language: 'TS',
        homepage: '',
        html_url: 'url2'
      }])
    }));
  });
  afterEach(() => {
    fetch.mockClear();
  });
  it('filters projects and updates live region', async () => {
    render(/*#__PURE__*/_jsx(ProjectGallery, {}));
    await waitFor(() => screen.getByText('Repo1'));
    fireEvent.click(screen.getByRole('button', {
      name: 'TS'
    }));
    await waitFor(() => expect(screen.queryByText('Repo1')).not.toBeInTheDocument());
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 project filtered by TS');
  });
});
