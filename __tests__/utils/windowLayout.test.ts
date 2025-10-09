import { updateDocumentSafeAreaProperties } from '../../utils/windowLayout';

describe('updateDocumentSafeAreaProperties', () => {
  const originalGetComputedStyle = window.getComputedStyle;
  const rootStyle = document.documentElement.style;
  const safeAreaVariables = [
    '--safe-area-top',
    '--safe-area-right',
    '--safe-area-bottom',
    '--safe-area-left',
  ];

  let computedValues: Record<string, string>;

  beforeEach(() => {
    computedValues = {
      top: '12px',
      right: '8px',
      bottom: '24px',
      left: '6px',
    };

    safeAreaVariables.forEach((variable) => {
      rootStyle.removeProperty(variable);
    });

    window.getComputedStyle = jest.fn(() => ({
      getPropertyValue: (property: string) => {
        switch (property) {
          case '--safe-area-top':
            return computedValues.top;
          case '--safe-area-right':
            return computedValues.right;
          case '--safe-area-bottom':
            return computedValues.bottom;
          case '--safe-area-left':
            return computedValues.left;
          default:
            return '0px';
        }
      },
    })) as any;
  });

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle;
    safeAreaVariables.forEach((variable) => {
      rootStyle.removeProperty(variable);
    });
    jest.restoreAllMocks();
  });

  it('writes measured safe-area values to documentElement custom properties', () => {
    const setPropertySpy = jest.spyOn(rootStyle, 'setProperty');

    const result = updateDocumentSafeAreaProperties();

    expect(result.insets).toEqual({ top: 12, right: 8, bottom: 24, left: 6 });
    expect(result.changed).toBe(true);
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-top', '12px');
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-right', '8px');
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-bottom', '24px');
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-left', '6px');
    expect(rootStyle.getPropertyValue('--safe-area-bottom')).toBe('24px');
  });

  it('updates CSS variables when safe-area measurements change', () => {
    updateDocumentSafeAreaProperties();

    const setPropertySpy = jest.spyOn(rootStyle, 'setProperty');

    computedValues.top = '20px';
    computedValues.left = '10px';

    const result = updateDocumentSafeAreaProperties();

    expect(result.changed).toBe(true);
    expect(setPropertySpy).toHaveBeenCalledTimes(2);
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-top', '20px');
    expect(setPropertySpy).toHaveBeenCalledWith('--safe-area-left', '10px');
    expect(rootStyle.getPropertyValue('--safe-area-top')).toBe('20px');
    expect(rootStyle.getPropertyValue('--safe-area-left')).toBe('10px');
  });
});
