import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';
test('project details open inside the app and preserve the filtered catalog', () => {
  render(<ProjectGallery />);
  const search = screen.getByRole('searchbox');
  fireEvent.change(search, { target: { value: 'crawler' } });
  fireEvent.click(screen.getByRole('button', { name: 'Web Crawler Studio' }));
  expect(screen.getByRole('heading', { name: 'Architecture' })).toBeVisible();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Back to projects/ }));
  expect(screen.getByRole('searchbox')).toHaveValue('crawler');
  expect(screen.getByRole('button', { name: 'Web Crawler Studio' })).toBeVisible();
});
test('a project route can open a specific native gallery detail', () => {
  render(<ProjectGallery initialProject="web-crawler" />);
  expect(screen.getByRole('heading', { name: 'Web Crawler Studio', level: 1 })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Architecture' })).toBeVisible();
});
