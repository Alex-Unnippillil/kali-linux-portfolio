import React from 'react';
import { STATUS_TONE_METADATA, StatusTone } from './statusMeta';

type AlertBannerProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: StatusTone;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

const AlertBanner: React.FC<AlertBannerProps> = ({
  tone = 'info',
  title,
  icon,
  className = '',
  children,
  ...props
}) => {
  const metadata = STATUS_TONE_METADATA[tone];
  const mergedClassName = `alert-banner ${className}`.trim();
  return (
    <div role="alert" data-tone={tone} className={mergedClassName} {...props}>
      <span className="alert-banner__icon" aria-hidden="true">
        {icon ?? metadata.icon}
      </span>
      <div className="alert-banner__body">
        {title && <p className="alert-banner__title">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default AlertBanner;
