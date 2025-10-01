import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { TaskQueueProvider, useTaskQueue } from '../hooks/useTaskQueue';
import { NotificationsContext } from '../components/common/NotificationCenter';

describe('useTaskQueue', () => {
  const createWrapper = () => {
    const pushNotification = jest.fn();
    const contextValue = {
      notificationsByApp: {},
      notifications: [],
      unreadCount: 0,
      pushNotification,
      dismissNotification: jest.fn(),
      clearNotifications: jest.fn(),
      markAllRead: jest.fn(),
    };

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <NotificationsContext.Provider value={contextValue}>
        <TaskQueueProvider>{children}</TaskQueueProvider>
      </NotificationsContext.Provider>
    );

    return { wrapper, pushNotification };
  };

  it('aggregates progress across active tasks and announces completions', () => {
    const { wrapper, pushNotification } = createWrapper();
    const { result } = renderHook(() => useTaskQueue(), { wrapper });

    act(() => {
      result.current.enqueueTask({
        id: 'task-1',
        title: 'Reconnaissance',
        appId: 'scanner',
        autoStart: true,
        progress: 0.25,
        etaMs: 5000,
      });
      result.current.enqueueTask({
        id: 'task-2',
        title: 'Report export',
        appId: 'scanner',
        autoStart: true,
        progress: 0.5,
        etaMs: 2000,
      });
      result.current.enqueueTask({
        id: 'task-3',
        title: 'Archive results',
        appId: 'scanner',
        autoStart: true,
        progress: 0.75,
        etaMs: 1000,
      });
    });

    expect(result.current.summary.active).toBe(3);
    expect(result.current.summary.averageProgress).toBeCloseTo((0.25 + 0.5 + 0.75) / 3, 5);
    expect(result.current.summary.etaMs).toBe(5000);

    act(() => {
      result.current.completeTask('task-1', { message: 'Reconnaissance finished' });
    });

    expect(pushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'scanner',
        title: expect.stringContaining('Reconnaissance'),
      }),
    );

    expect(result.current.summary.active).toBe(2);
    expect(result.current.summary.averageProgress).toBeCloseTo((0.5 + 0.75) / 2, 5);
    expect(result.current.summary.etaMs).toBe(2000);
  });

  it('cancels tasks and triggers rollback when available', async () => {
    const { wrapper } = createWrapper();
    const cancelSpy = jest.fn().mockResolvedValue(undefined);
    const rollbackSpy = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskQueue(), { wrapper });

    act(() => {
      result.current.enqueueTask({
        id: 'cancel-test',
        title: 'Generate artifact',
        appId: 'pipeline',
        autoStart: true,
        operations: {
          cancel: cancelSpy,
          rollback: rollbackSpy,
        },
        progress: 0.4,
        etaMs: 4000,
      });
    });

    await act(async () => {
      await result.current.cancelTask('cancel-test', 'User aborted');
    });

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(rollbackSpy).toHaveBeenCalledTimes(1);

    const cancelled = result.current.tasks.find((task) => task.id === 'cancel-test');
    expect(cancelled?.status).toBe('canceled');
    expect(cancelled?.progress).toBe(0);
    expect(result.current.summary.active).toBe(0);
    expect(result.current.summary.etaMs).toBeNull();
  });
});
