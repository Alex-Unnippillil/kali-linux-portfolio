'use client';

import type { FC } from 'react';
import useSyncConflicts from '../../hooks/useSyncConflicts';

const SyncConflictManager: FC = () => {
  const { dialog } = useSyncConflicts();
  return dialog;
};

export default SyncConflictManager;

