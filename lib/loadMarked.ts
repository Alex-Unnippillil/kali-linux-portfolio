let loader: Promise<typeof import('marked')> | null = null;

export const loadMarked = () => {
  if (!loader) {
    loader = import('marked');
  }
  return loader;
};
