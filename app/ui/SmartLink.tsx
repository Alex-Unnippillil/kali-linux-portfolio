import Link from 'next/link';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';

export type SmartLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement>
> & {
  href: string;
};

export default function SmartLink({ href, children, ...rest }: SmartLinkProps) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...rest} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
