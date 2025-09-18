import { useContext } from 'react';
import { DownloadManagerContext } from '../components/common/DownloadManager';

export const useDownloads = () => {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx) {
    throw new Error('useDownloads must be used within DownloadManagerProvider');
  }
  return ctx;
};

export default useDownloads;
