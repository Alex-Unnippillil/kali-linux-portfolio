import React from 'react';
const STORAGE_KEY = 'read-later-items';
const loadItems = () => {
    if (typeof window === 'undefined')
        return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }
    catch {
        return [];
    }
};
const saveItems = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};
export const useReadLater = () => {
    const [items, setItems] = React.useState(loadItems);
    const add = (item) => {
        setItems((prev) => {
            const next = [...prev, item];
            saveItems(next);
            return next;
        });
    };
    const remove = (url) => {
        setItems((prev) => {
            const next = prev.filter((i) => i.url !== url);
            saveItems(next);
            return next;
        });
    };
    const exportJson = () => {
        const blob = new Blob([JSON.stringify(items, null, 2)], {
            type: 'application/json',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'read-later.json';
        a.click();
    };
    return { items, add, remove, exportJson };
};
const ReadLaterList = () => {
    const { items, exportJson } = useReadLater();
    return (<div>
      <h2>Read Later</h2>
      <ul>
        {items.map((item) => (<li key={item.url}>
            <a href={item.url}>{item.title}</a>
            <p>{item.excerpt}</p>
          </li>))}
      </ul>
      <button onClick={exportJson}>Export</button>
    </div>);
};
export default ReadLaterList;
