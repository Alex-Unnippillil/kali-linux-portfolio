import React from 'react';
import styles from './small_arrow.module.css';

export default function SmallArrow({ angle = 'up', className = '', ...props }) {
    const rotations = {
        up: '',
        down: 'rotate-180',
        left: '-rotate-90',
        right: 'rotate-90',
    };

    return <div {...props} className={`${styles.arrow} ${rotations[angle] ?? ''} ${className}`}></div>;
}
