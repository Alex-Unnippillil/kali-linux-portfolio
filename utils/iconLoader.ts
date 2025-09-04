export type IconPack = Record<string, string>;

export const DEFAULT_ICON_PACK: IconPack = {
  close: '/themes/Yaru/window/window-close-symbolic.svg',
  minimize: '/themes/Yaru/window/window-minimize-symbolic.svg',
  maximize: '/themes/Yaru/window/window-maximize-symbolic.svg',
  restore: '/themes/Yaru/window/window-restore-symbolic.svg',
  pin: '/themes/Yaru/window/window-pin-symbolic.svg',
};

export async function loadIconPack(theme: string): Promise<IconPack> {
  switch (theme) {
    case 'flat-remix-blue': {
      try {
        const mod = await import('../themes/flat-remix-blue/icons.json', {
          assert: { type: 'json' },
        } as any);
        return (mod as any).default ?? mod;
      } catch (err) {
        console.warn(`Unable to load icon pack "${theme}":`, err);
        return DEFAULT_ICON_PACK;
      }
    }
    case 'Yaru':
    default:
      return DEFAULT_ICON_PACK;
  }
}
