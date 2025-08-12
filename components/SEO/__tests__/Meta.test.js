import React from 'react';
import { render } from '@testing-library/react';
import Meta from '../Meta';

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

describe('Meta component', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('renders provided title, description, and image', () => {
    const props = {
      title: 'Custom Title',
      description: 'Custom description',
      image: '/custom.png',
    };

    const { container } = render(<Meta {...props} />);

    expect(container.querySelector('meta[name="title"]').getAttribute('content')).toBe(props.title);
    expect(container.querySelector('meta[name="description"]').getAttribute('content')).toBe(props.description);
    expect(container.querySelector('meta[name="og:image"]').getAttribute('content')).toBe(props.image);
  });
});
