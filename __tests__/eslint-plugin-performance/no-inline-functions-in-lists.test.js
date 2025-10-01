const { RuleTester } = require('eslint');
const rule = require('../../eslint-plugin-performance/rules/no-inline-functions-in-lists');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('no-inline-functions-in-lists', rule, {
  valid: [
    {
      code: `
        const Item = ({ onSelect }) => <button onClick={onSelect} />;
        const Example = ({ items, onSelect }) => (
          <div>
            {items.map((item) => (
              <Item key={item.id} onSelect={onSelect} />
            ))}
          </div>
        );
      `,
    },
    {
      code: `
        items.map((item) => {
          const onClick = createHandler(item);
          return <button key={item.id} onClick={onClick} />;
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
        items.map((item) => (
          <button key={item.id} onClick={() => handle(item)} />
        ));
      `,
      errors: [{ messageId: 'moveHandler' }],
    },
    {
      code: `
        list.filter(Boolean).map(function (item) {
          return <input key={item.id} onChange={function (event) { update(item, event.target.value); }} />;
        });
      `,
      errors: 1,
    },
  ],
});
