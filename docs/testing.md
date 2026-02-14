# Testing Guidelines

This project relies on Jest and Testing Library for unit tests. To keep specs
focused on behaviour instead of static fixtures, use the factory helpers under
`tests/builders` whenever you need mock data.

## Test data builders

- `tests/builders/metasploit.ts` generates Metasploit modules and loot API
  payloads.
- `tests/builders/dsniff.ts` builds demo traffic for the Dsniff simulations.
- `tests/builders/volatility.ts` produces the Volatility memory, process, and
  table fixtures used by forensic apps.

### Using a builder in a test

```ts
import { buildMetasploitModule } from '../tests/builders/metasploit';

const exploitModule = buildMetasploitModule({
  name: 'exploit/windows/smb/ms17_010_eternalblue',
  type: 'exploit',
});

jest.mock('../components/apps/metasploit/modules.json', () => ({
  __esModule: true,
  default: [exploitModule],
}));
```

The builders return plain objects, so you can override any field that matters for
the scenario under test. Always mock the original fixture import to point at your
builder output instead of reading JSON files directly.

## Writing new tests

1. Import the builders that match your feature area.
2. Create the data your component needs and override just the pieces you care
   about.
3. Mock the JSON module (or network response) so the component under test uses
   your generated data.
4. Assert on behaviour rather than fixture file names or paths.

Following this pattern keeps tests resilient even if the demo fixtures change in
content or location.
