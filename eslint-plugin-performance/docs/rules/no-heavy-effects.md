# no-heavy-effects

Expensive computations inside `useEffect` without a dependency array run after every render. That work can dominate interaction time
and keep React busy even when nothing meaningful changed.

## Rule details

This rule looks for loops or heavy collection operations inside a `useEffect` callback that does not specify a dependency array.
When found, it reports the effect and suggests limiting it with an empty dependency array.

### Incorrect

```jsx
function Dashboard({ reports }) {
  React.useEffect(() => {
    for (const report of reports) {
      crunchReport(report);
    }
  });
}
```

### Correct

```jsx
function Dashboard({ reports }) {
  React.useEffect(() => {
    for (const report of reports) {
      crunchReport(report);
    }
  }, [reports]);
}
```

If the work is still expensive, move it out of the effect entirely or throttle it with background scheduling APIs.
