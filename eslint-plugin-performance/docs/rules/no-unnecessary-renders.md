# no-unnecessary-renders

Memoization hooks such as `useMemo` and `useCallback` require a dependency array. Without it, React recomputes the value on every
render, negating the optimization and creating new references that can cascade into more renders.

## Rule details

The rule flags calls to `useMemo` or `useCallback` that omit the dependency array or provide a non-array second argument. When
possible it suggests adding an empty array so the value is memoized until its inputs change.

### Incorrect

```jsx
const expensive = React.useMemo(() => heavyCalculation(data));
```

### Correct

```jsx
const expensive = React.useMemo(() => heavyCalculation(data), [data]);
```

If the memoized callback or value depends on multiple props, include each one in the array.
