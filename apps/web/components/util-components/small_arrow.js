import React from 'react';
import styles from './small_arrow.module.css';

export default function SmallArrow({ angle = 'up' }) {
    const rotations = {
        up: '',
        down: 'rotate-180',
        left: '-rotate-90',
        right: 'rotate-90',
    };

    return <div className={`${styles.arrow} ${rotations[angle] ?? ''}`}></div>;
}
