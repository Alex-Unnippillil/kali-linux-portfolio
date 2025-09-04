export const addRecentApp = (list: string[], id: string, limit = 10): string[] => {
  const newList = [id, ...list.filter(appId => appId !== id)];
  return newList.slice(0, limit);
};

export default addRecentApp;
