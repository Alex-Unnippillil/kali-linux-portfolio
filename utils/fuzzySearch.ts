export function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      qi++;
    }
    ti++;
  }
  return qi === q.length;
}

export default function fuzzySearch<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  if (!query) return items;
  return items.filter((item) => fuzzyMatch(getText(item), query));
}
