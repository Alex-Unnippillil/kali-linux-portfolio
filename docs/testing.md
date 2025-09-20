# Testing guide

## Calculator fuzz test

A deterministic fuzz test protects the calculator parser by evaluating a large batch of seeded expressions. Run it with Jest:

```bash
yarn test -- calculator.fuzz
```

The test will fail if any expression throws or if the average evaluation time reaches 10 ms or more. When a failure occurs the output includes diagnostics showing the number of iterations, the measured timing, and sample expressions that triggered issues.
