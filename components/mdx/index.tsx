import type { ComponentPropsWithoutRef } from 'react';
import Admonition from './Admonition';

function Img(
  { className = '', border = false, ...props }: ComponentPropsWithoutRef<'img'> & { border?: boolean }
) {
  const classes = ['mdx-img', border ? 'mdx-img--border' : '', className]
    .filter(Boolean)
    .join(' ');
  return <img {...props} className={classes} />;
}

function Figcaption({ className = '', ...props }: ComponentPropsWithoutRef<'figcaption'>) {
  const classes = ['mdx-caption', className].filter(Boolean).join(' ');
  return <figcaption {...props} className={classes} />;
}

export const mdxComponents = {
  img: Img,
  figcaption: Figcaption,
  Admonition,
};

export default mdxComponents;
