import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AboutAlex } from '../components/apps/alex';

jest.mock('../components/apps/certs', () => function CertificatesMock() { return <div>Certificates</div>; });
jest.mock('react-activity-calendar', () => function ActivityMock() { return <div>Activity</div>; });
afterEach(() => localStorage.clear());

test('About sections do not duplicate the native window ID, including the mobile menu', () => {
  const { container } = render(<div id="about"><AboutAlex /></div>);
  expect(container.querySelectorAll('#about')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'About Alex sections', exact: true }));
  expect(container.querySelectorAll('#about')).toHaveLength(1);
  const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(screen.getByRole('button', { name: 'About Alex sections', exact: true })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(screen.getByRole('navigation', { name: 'About Alex sections' }), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'About Alex sections', exact: true })).toHaveFocus();
});
