import { act, renderHook } from '@testing-library/react';

import { useSerialLog } from '../components/apps/serial-terminal';

describe('useSerialLog', () => {
  it('respects the logging toggle when appending data', () => {
    const { result } = renderHook(() => useSerialLog({ maxBytes: 32 }));

    act(() => {
      result.current.appendLog('first');
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.setLoggingEnabled(false);
    });

    act(() => {
      result.current.appendLog('second');
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.setLoggingEnabled(true);
      result.current.appendLog('third');
    });

    expect(result.current.entries).toHaveLength(2);
  });

  it('resets logs on disconnect unless persistence is enabled', () => {
    const { result } = renderHook(() => useSerialLog({ maxBytes: 64 }));

    act(() => {
      result.current.appendLog('session');
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.resetOnDisconnect();
    });

    expect(result.current.entries).toHaveLength(0);

    act(() => {
      result.current.appendLog('persisted');
      result.current.setPersistLogs(true);
    });

    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.resetOnDisconnect();
    });

    expect(result.current.entries).toHaveLength(1);
  });
});

