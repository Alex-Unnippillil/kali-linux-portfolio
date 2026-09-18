'use client';
import React from 'react';
import XProfileApp from '../../apps/x';

// The desktop window and /apps/x intentionally share one implementation.
export default XProfileApp;
export const displayX = () => <XProfileApp />;
