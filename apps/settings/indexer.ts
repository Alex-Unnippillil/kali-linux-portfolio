export interface SettingIndex {
  element: HTMLElement;
  label: string;
}

export function indexSettings(root: HTMLElement): SettingIndex[] {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>('[data-setting-label]')
  );
  return elements.map((el) => ({
    element: el,
    label: el.dataset.settingLabel || '',
  }));
}
