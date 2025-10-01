# no-inline-functions-in-lists

Inline handlers created inside list rendering callbacks (such as `Array#map`) are recreated on every render. This increases garbage
collection pressure and can cause avoidable re-renders for memoized children.

## Rule details

This rule flags inline function expressions that are assigned to JSX attributes while rendering inside common list helpers.

### Incorrect

```jsx
function List({ items, onSelect }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onSelect(item)}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

### Correct

```jsx
function ListItem({ item, onSelect }) {
  return (
    <li data-id={item.id} onClick={onSelect}>
      {item.label}
    </li>
  );
}

function List({ items, onSelect }) {
  const handleSelect = React.useCallback(
    (event) => {
      const id = event.currentTarget.dataset.id;
      const next = items.find((entry) => String(entry.id) === id);
      if (next) {
        onSelect(next);
      }
    },
    [items, onSelect]
  );

  return (
    <ul>
      {items.map((item) => (
        <ListItem key={item.id} item={item} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

Extract the handler outside of the list callback or memoize it so that React can preserve prop references between renders.
