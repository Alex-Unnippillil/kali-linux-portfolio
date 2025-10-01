import { useContext } from 'react';
import { TasksManagerContext } from '../components/common/TasksManager';

export const useTasksManager = () => {
  const ctx = useContext(TasksManagerContext);
  if (!ctx) {
    throw new Error('useTasksManager must be used within TasksManagerProvider');
  }
  return ctx;
};

export default useTasksManager;
