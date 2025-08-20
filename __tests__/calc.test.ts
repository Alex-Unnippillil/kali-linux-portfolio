import { Calc } from "../components/apps/calc";

describe("Calc output sanitization", () => {
  test("renders expressions and errors as plain text", () => {
    const calc = new Calc({});
    // stub appendTerminalRow to avoid React state updates
    // @ts-ignore
    calc.appendTerminalRow = jest.fn();

    const resultEl = document.createElement("div");
    resultEl.id = "row-calculator-result-1";
    document.body.appendChild(resultEl);

    // expression producing HTML-like string
    // @ts-ignore
    calc.handleCommands('"<img src=x>"', 1);
    expect(resultEl.textContent).toBe('<img src=x>');
    expect(resultEl.innerHTML).toBe('&lt;img src=x&gt;');

    // invalid expression results in error text
    // @ts-ignore
    calc.handleCommands('2 < 3', 1);
    expect(resultEl.textContent).toBe('Invalid Expression');
    expect(resultEl.innerHTML).toBe('Invalid Expression');
  });
});
