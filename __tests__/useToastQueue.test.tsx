import React, { forwardRef, useImperativeHandle } from 'react';
import { act, render } from '@testing-library/react';
import useToastQueue, { ToastQueueApi } from '../hooks/useToastQueue';

type HookRef = React.RefObject<ToastQueueApi | undefined>;

const HookHarness = forwardRef<ToastQueueApi | undefined>((_, ref) => {
  const api = useToastQueue({ maxVisible: 3, undoWindow: 200 });
  useImperativeHandle(ref, () => api, [api]);
  return null;
});
HookHarness.displayName = 'HookHarness';

describe('useToastQueue', () => {
  const renderHook = () => {
    const ref = React.createRef<ToastQueueApi>();
    render(<HookHarness ref={ref} />);
    return ref as HookRef;
  };

  it('deduplicates identical messages and increments count', () => {
    const ref = renderHook();

    act(() => {
      ref.current?.enqueueToast({ message: 'Saved' });
      ref.current?.enqueueToast({ message: 'Saved' });
    });

    expect(ref.current?.toasts).toHaveLength(1);
    expect(ref.current?.toasts?.[0].count).toBe(2);
  });

  it('returns the same id for grouped toasts and respects max visible count', () => {
    const ref = renderHook();

    let firstId = '';
    let duplicateId = '';
    act(() => {
      firstId = ref.current?.enqueueToast({ message: 'First' }) ?? '';
      duplicateId = ref.current?.enqueueToast({ message: 'First' }) ?? '';
      ref.current?.enqueueToast({ message: 'Second', groupKey: 'second' });
      ref.current?.enqueueToast({ message: 'Third', groupKey: 'third' });
      ref.current?.enqueueToast({ message: 'Fourth', groupKey: 'fourth' });
    });

    expect(duplicateId).toBe(firstId);
    const messages = ref.current?.toasts.map((toast) => toast.message) ?? [];
    expect(messages).not.toContain('First');
    expect(messages).toEqual(['Second', 'Third', 'Fourth']);
  });
});
