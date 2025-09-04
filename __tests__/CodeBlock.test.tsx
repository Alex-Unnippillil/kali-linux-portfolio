import { render, screen, fireEvent } from "@testing-library/react";
import CodeBlock from "../components/CodeBlock";

jest.mock("highlight.js", () => ({
  highlight: jest.fn((code: string) => ({ value: code })),
  highlightAuto: jest.fn((code: string) => ({ value: code })),
}));

const hljs = require("highlight.js");

test("uses manual language override", () => {
  render(<CodeBlock code="console.log('hi')" language="javascript" />);
  expect(hljs.highlight).toHaveBeenCalledWith("console.log('hi')", {
    language: "javascript",
  });
});

test("auto-detects language", () => {
  render(<CodeBlock code="console.log('hi')" />);
  expect(hljs.highlightAuto).toHaveBeenCalledWith("console.log('hi')");
});

test("highlights specified lines", () => {
  const { container } = render(
    <CodeBlock code={`a\nb\nc`} highlight={[2]} />
  );
  const lines = container.querySelectorAll("pre > div");
  expect(lines[1].className).toMatch("bg-yellow-800/40");
});

test("renders tabs for multiple files", () => {
  render(
    <CodeBlock
      files={[
        { name: "a.txt", code: "one" },
        { name: "b.txt", code: "two" },
      ]}
    />
  );
  // initial file
  expect(screen.getByText("one")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "b.txt" }));
  expect(screen.getByText("two")).toBeInTheDocument();
});
