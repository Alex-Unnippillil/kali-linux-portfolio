import React from 'react';
import { render, screen } from '@testing-library/react';

import MDXComponents, { MDXImageMetadataProvider } from '../../../components/docs/MDXComponents';

jest.mock('next/image', () =>
  React.forwardRef<HTMLImageElement, React.ComponentProps<'img'> & { placeholder?: string; blurDataURL?: string; priority?: boolean }>(
    ({ placeholder, blurDataURL, priority, ...props }, ref) => (
      <img
        data-next-image="true"
        data-placeholder={placeholder}
        data-priority={priority ? 'true' : 'false'}
        data-has-blur={blurDataURL ? 'true' : 'false'}
        ref={ref}
        {...props}
      />
    )
  )
);

describe('MDXComponents image wrapper', () => {
  const DocImage = MDXComponents.img as React.ComponentType<React.ComponentProps<'img'>>;

  it('uses Next.js image metadata when available on the static import', () => {
    const staticImport = {
      src: '/images/example.png',
      width: 1280,
      height: 720,
      blurDataURL: 'data:image/png;base64,AAA',
    };

    render(<DocImage src={staticImport as any} alt="Static" />);

    const img = screen.getByRole('img', { name: 'Static' });
    expect(img.dataset.nextImage).toBe('true');
    expect(img).toHaveAttribute('width', '1280');
    expect(img).toHaveAttribute('height', '720');
    expect(img.dataset.placeholder).toBe('blur');
    expect(img.dataset.hasBlur).toBe('true');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('hydrates width and height from frontmatter metadata when static data is missing', () => {
    render(
      <MDXImageMetadataProvider
        images={{
          '/docs/remote.png': { width: 640, height: 480, blurDataURL: 'data:image/png;base64,BBB' },
        }}
      >
        <DocImage src="/docs/remote.png" alt="Remote" />
      </MDXImageMetadataProvider>
    );

    const img = screen.getByRole('img', { name: 'Remote' });
    expect(img.dataset.nextImage).toBe('true');
    expect(img).toHaveAttribute('width', '640');
    expect(img).toHaveAttribute('height', '480');
    expect(img.dataset.placeholder).toBe('blur');
    expect(img.dataset.hasBlur).toBe('true');
  });

  it('falls back to a plain img element when metadata cannot be resolved', () => {
    render(<DocImage src="/docs/unknown.png" alt="Fallback" />);

    const img = screen.getByRole('img', { name: 'Fallback' });
    expect(img.dataset.nextImage).toBeUndefined();
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
