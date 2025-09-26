import apps, { utilities, games } from '../apps.config';

export type AppIndexEntry = {
  id: string;
  label: string;
  keywords: string[];
  category: string;
  icon: string;
  favourite?: boolean;
  disabled?: boolean;
};

type AppConfig = {
  id: string;
  title: string;
  icon: string;
  favourite?: boolean;
  disabled?: boolean;
};

const toKeywordSet = (app: AppConfig, category: string) => {
  const values = new Set<string>();
  const title = app.title.trim();
  const id = app.id.trim();
  if (title) {
    values.add(title);
    values.add(title.toLowerCase());
    title
      .replace(/[\s/]+/g, ' ')
      .split(' ')
      .forEach(part => {
        const token = part.trim();
        if (token) {
          values.add(token);
          values.add(token.toLowerCase());
        }
      });
  }
  if (id) {
    values.add(id);
    id
      .split(/[-_]+/)
      .forEach(part => {
        const token = part.trim();
        if (token) {
          values.add(token);
          values.add(token.toLowerCase());
        }
      });
  }
  values.add(category);
  values.add(category.toLowerCase());
  return Array.from(values);
};

const utilityIds = new Set((utilities as AppConfig[]).map(item => item.id));
const gameIds = new Set((games as AppConfig[]).map(item => item.id));

const records = new Map<string, AppIndexEntry>();

(apps as AppConfig[]).forEach(app => {
  const category = gameIds.has(app.id)
    ? 'games'
    : utilityIds.has(app.id)
      ? 'utilities'
      : 'applications';

  records.set(app.id, {
    id: app.id,
    label: app.title,
    keywords: toKeywordSet(app, category),
    category,
    icon: app.icon,
    favourite: app.favourite,
    disabled: app.disabled,
  });
});

export const appIndex: AppIndexEntry[] = Array.from(records.values());
export const appIndexMap = new Map(appIndex.map(entry => [entry.id, entry]));

export default appIndex;
