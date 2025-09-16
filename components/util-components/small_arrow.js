import React from 'react';
import styles from './small_arrow.module.css';

export default function SmallArrow({ angle = 'up', className = '' }) {
    const rotations = {
        up: '',
        down: 'rotate-180',
        left: '-rotate-90',
        right: 'rotate-90',
    };

    const classes = [styles.arrow, rotations[angle] ?? '', className]
        .filter(Boolean)
        .join(' ')
        .trim();

    return <div className={classes}></div>;
}
