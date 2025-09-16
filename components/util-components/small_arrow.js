import React, { useMemo } from 'react';
import useLocaleDirection from '../../hooks/useLocaleDirection';
import styles from './small_arrow.module.css';

export default function SmallArrow({ angle = 'up' }) {
    const direction = useLocaleDirection();
    const resolvedAngle = useMemo(() => {
        if (direction !== 'rtl') return angle;
        if (angle === 'left') return 'right';
        if (angle === 'right') return 'left';
        return angle;
    }, [angle, direction]);

    const rotations = {
        up: '',
        down: 'rotate-180',
        left: '-rotate-90',
        right: 'rotate-90',
    };

    return <div className={`${styles.arrow} ${rotations[resolvedAngle] ?? ''}`}></div>;
}
