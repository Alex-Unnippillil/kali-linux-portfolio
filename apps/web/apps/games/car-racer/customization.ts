export type CarSkin = {
  key: string;
  label: string;
  color: string;
  src: string;
};

// Simple SVG-based skins to avoid external assets
export const CAR_SKINS: CarSkin[] = [
  {
    key: 'red',
    label: 'Red',
    color: '#ef4444',
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="50"><rect width="30" height="50" rx="4" ry="4" fill="%23ef4444"/></svg>',
  },
  {
    key: 'blue',
    label: 'Blue',
    color: '#3b82f6',
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="50"><rect width="30" height="50" rx="4" ry="4" fill="%233b82f6"/></svg>',
  },
  {
    key: 'green',
    label: 'Green',
    color: '#10b981',
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="50"><rect width="30" height="50" rx="4" ry="4" fill="%2310b981"/></svg>',
  },
];

export async function loadSkinAssets(): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    CAR_SKINS.map(
      (skin) =>
        new Promise<[string, HTMLImageElement]>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([skin.key, img]);
          img.src = skin.src;
        }),
    ),
  );
  return Object.fromEntries(entries);
}
