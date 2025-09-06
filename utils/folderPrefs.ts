export interface FolderPrefs {
  viewMode: string;
  sort: string;
  zoom: number;
}

const key = (path: string) => `folderPrefs:${path}`;

export const saveFolderPrefs = (path: string, prefs: FolderPrefs): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(path), JSON.stringify(prefs));
};

export const loadFolderPrefs = (path: string): FolderPrefs | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key(path));
  return raw ? (JSON.parse(raw) as FolderPrefs) : null;
};
