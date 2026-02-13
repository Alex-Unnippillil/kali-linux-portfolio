import clsx from 'clsx';
import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingAlign = 'start' | 'center' | 'end';

type HeadingProps<T extends ElementType> = {
  as?: T;
  level?: HeadingLevel;
  align?: HeadingAlign;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>;

const levelClassMap: Record<HeadingLevel, string> = {
  1: 'heading--1',
  2: 'heading--2',
  3: 'heading--3',
  4: 'heading--4',
  5: 'heading--5',
  6: 'heading--6',
};

const alignClassMap: Record<Exclude<HeadingAlign, 'start'>, string> = {
  center: 'heading--align-center',
  end: 'heading--align-end',
};

const headingTagPattern = /^h[1-6]$/;

export function Heading<T extends ElementType = 'h2'>({
  as,
  level,
  align = 'start',
  className,
  children,
  ...rest
}: HeadingProps<T>) {
  const inferredLevel =
    level ??
    (typeof as === 'string' && headingTagPattern.test(as)
      ? (Number(as.slice(1)) as HeadingLevel)
      : 2);

  const Component = (as ?? (`h${inferredLevel}` as ElementType)) as ElementType;

  return (
    <Component
      className={clsx(
        'heading',
        levelClassMap[inferredLevel],
        align !== 'start' ? alignClassMap[align] : null,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default Heading;
