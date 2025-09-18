import catalog from '../data/apps.json';

export interface AppCategory {
  id: string;
  label: string;
  description?: string;
}

export interface AppMetadata {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

interface AppCatalogSchema {
  generatedAt?: string;
  categories: AppCategory[];
  apps: AppMetadata[];
}

const typedCatalog = catalog as AppCatalogSchema;

export const appCategories: AppCategory[] = typedCatalog.categories;
export const appMetadata: AppMetadata[] = typedCatalog.apps;

export const appCategoryMap: Map<string, AppCategory> = new Map(
  appCategories.map((category) => [category.id, category]),
);

export const appMetadataMap: Map<string, AppMetadata> = new Map(
  appMetadata.map((app) => [app.id, app]),
);

export interface SearchDocument {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  tags: string[];
}

export const getSearchDocuments = (): SearchDocument[] =>
  appMetadata.map((app) => ({
    id: app.id,
    title: app.title,
    categoryId: app.category,
    categoryLabel: appCategoryMap.get(app.category)?.label ?? app.category,
    tags: app.tags,
  }));

export default typedCatalog;
