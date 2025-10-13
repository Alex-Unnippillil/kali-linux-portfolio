import React from 'react';
import clsx from 'clsx';
import styles from './card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, variant = 'default', ...props }, ref) => (
    <article
      ref={ref}
      data-variant={variant === 'default' ? undefined : variant}
      className={clsx(styles.card, className)}
      {...props}
    >
      {children}
    </article>
  ),
);

Card.displayName = 'Card';

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <header ref={ref} className={clsx(styles.header, className)} {...props}>
      {children}
    </header>
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <footer ref={ref} className={clsx(styles.footer, className)} {...props}>
      {children}
    </footer>
  ),
);
CardFooter.displayName = 'CardFooter';

export const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx(styles.content, className)} {...props}>
      {children}
    </div>
  ),
);
CardContent.displayName = 'CardContent';

export const CardActions = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx(styles.actions, className)} {...props}>
      {children}
    </div>
  ),
);
CardActions.displayName = 'CardActions';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={clsx(styles.title, className)} {...props}>
      {children}
    </h3>
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={clsx(styles.description, className)} {...props}>
      {children}
    </p>
  ),
);
CardDescription.displayName = 'CardDescription';

export default Card;
