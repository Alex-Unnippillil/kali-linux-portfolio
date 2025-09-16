import React from 'react';
import Image, { ImageProps } from 'next/image';
import { useDirection } from './DirectionProvider';

type Props = ImageProps & {
  flipForRtl?: boolean;
};

const DirectionalIcon: React.FC<Props> = ({ flipForRtl = false, className, ...props }) => {
  const { isRTL } = useDirection();
  const classes = [className, flipForRtl && isRTL ? 'rtl-flip' : '']
    .filter(Boolean)
    .join(' ')
    .trim();

  return <Image {...props} className={classes || undefined} />;
};

export default DirectionalIcon;
