import { Desktop } from '../components/screen/desktop';

describe('Desktop focus orchestration', () => {
  it('keeps only the requested window focused on focus swaps', () => {
    const desktop = new Desktop();
    desktop.state = {
      ...desktop.state,
      focused_windows: { app1: false, app2: true, app3: false },
    };

    const setStateSpy = jest.spyOn(desktop, 'setState').mockImplementation((update) => {
      const nextState =
        typeof update === 'function' ? update(desktop.state, desktop.props) : update;
      desktop.state = {
        ...desktop.state,
        ...nextState,
      };
    });

    desktop.focus('app1');
    expect(desktop.state.focused_windows).toEqual({ app1: true, app2: false, app3: false });
    expect(
      Object.values(desktop.state.focused_windows).filter(Boolean)
    ).toHaveLength(1);

    desktop.focus('app2');
    expect(desktop.state.focused_windows).toEqual({ app1: false, app2: true, app3: false });
    expect(
      Object.values(desktop.state.focused_windows).filter(Boolean)
    ).toHaveLength(1);

    expect(setStateSpy).toHaveBeenCalledTimes(2);
    setStateSpy.mockRestore();
  });
});
