import React from 'react';
import SmallArrow from '../util-components/small_arrow';
import { useDirection } from './DirectionProvider';

type LogicalDirection = 'up' | 'down' | 'left' | 'right' | 'start' | 'end';

interface Props {
  direction: LogicalDirection;
  className?: string;
}

const LogicalArrow: React.FC<Props> = ({ direction, className }) => {
  const { isRTL } = useDirection();

  const resolved = React.useMemo(() => {
    if (direction === 'start') {
      return isRTL ? 'right' : 'left';
    }
    if (direction === 'end') {
      return isRTL ? 'left' : 'right';
    }
    if (direction === 'left') {
      return isRTL ? 'right' : 'left';
    }
    if (direction === 'right') {
      return isRTL ? 'left' : 'right';
    }
    return direction;
  }, [direction, isRTL]);

  return <SmallArrow angle={resolved} className={className} />;
};

export default LogicalArrow;
