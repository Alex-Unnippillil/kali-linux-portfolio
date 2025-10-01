import { useContext } from 'react';
import { DataRetentionContext } from '../components/common/DataRetentionProvider';

export const useDataRetention = () => {
  const ctx = useContext(DataRetentionContext);
  if (!ctx) {
    throw new Error('useDataRetention must be used within DataRetentionProvider');
  }
  return ctx;
};

export default useDataRetention;
