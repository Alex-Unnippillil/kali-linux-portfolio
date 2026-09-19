import React, { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import VsCode from "../apps/vscode";
import userEvent from "@testing-library/user-event";

// DOM tests use the immediate text editor; browser tests load and edit the real Monaco engine.
jest.mock("../apps/vscode/monaco", () => {
  throw new Error("Use text fallback for jsdom");
});
const revision = "a".repeat(40);
const files = ["README.md", "package.json", "apps/x/index.tsx"].map(
  (path, index) => ({
    path,
    language: path.endsWith(".json")
      ? "json"
      : path.endsWith(".md")
        ? "markdown"
        : "typescript",
    bytes: 50,
    asset: String(index + 1).repeat(64),
  }),
);
const manifest = {
  version: 1,
  repository: "Alex-Unnippillil/kali-linux-portfolio",
  ref: "main",
  revision,
  generatedAt: "2026-09-18T00:00:00Z",
  files,
  omitted: 0,
};
const content = {
  "README.md": "# Test repository source\nActual test input.",
  "package.json": '{"name":"source-fixture"}',
  "apps/x/index.tsx": "export default function App() { return null; }",
};
const response = (body: unknown) =>
  ({
    ok: true,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  }) as Response;
let fetchMock: jest.SpyInstance;
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("index.json")) return response(manifest);
    const file = files.find((entry) => url.includes(entry.asset));
    if (!file) throw new Error("Unexpected request");
    return response({
      path: file.path,
      content: content[file.path as keyof typeof content],
    });
  });
});
afterEach(() => jest.restoreAllMocks());
it("automatically opens repository source without any StackBlitz iframe or confirmation", async () => {
  const { container } = render(<VsCode />);
  const area = await screen.findByRole("textbox", {
    name: "Code editor for README.md",
  });
  await waitFor(() => expect(area).toHaveValue(content["README.md"]));
  expect(container.querySelector("iframe")).toBeNull();
  expect(
    screen.queryByText(/Enable network|Open in StackBlitz/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "View original file on GitHub" }),
  ).toHaveAttribute(
    "href",
    `https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/${revision}/README.md`,
  );
  expect(
    fetchMock.mock.calls.every(([url]) =>
      String(url).startsWith("/showcase/repository/"),
    ),
  ).toBe(true);
});
it("opens files by keyboard Quick Open and retains session edits after closing their tab", async () => {
  const { container } = render(<VsCode />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Code editor for README.md" }),
    ).toHaveValue(content["README.md"]),
  );
  fireEvent.keyDown(container.firstChild!, { key: "p", ctrlKey: true });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "package.json" },
  });
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
  const area = screen.getByRole("textbox", {
    name: "Code editor for package.json",
  });
  await waitFor(() => expect(area).toHaveValue(content["package.json"]));
  fireEvent.change(area, { target: { value: '{"edited":true}' } });
  fireEvent.click(screen.getByRole("button", { name: "Close package.json" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Local changes, 1 files" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /package.json package.json M/ }),
  );
  expect(
    screen.getByRole("textbox", { name: "Code editor for package.json" }),
  ).toHaveValue('{"edited":true}');
});
it("preserves other files and retries when an individual source response fails", async () => {
  render(<VsCode />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Code editor for README.md" }),
    ).toHaveValue(content["README.md"]),
  );
  fetchMock.mockResolvedValueOnce(
    response({ path: "wrong.ts", content: "do not display" }),
  );
  fireEvent.click(screen.getByRole("treeitem", { name: "package.json" }));
  await screen.findByRole("alert");
  expect(
    screen.getByRole("textbox", { name: "Code editor for package.json" }),
  ).not.toHaveValue("do not display");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Code editor for package.json" }),
    ).toHaveValue(content["package.json"]),
  );
});
it("aborts stale StrictMode requests and ignores their late responses", async () => {
  let resolveOld: (value: Response) => void = () => {};
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const { unmount } = render(
    <StrictMode>
      <VsCode />
    </StrictMode>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Code editor for README.md" }),
    ).toHaveValue(content["README.md"]),
  );
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => resolveOld(response({ invalid: true })));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  unmount();
});

it("keeps Tab and Shift+Tab inside modal Quick Open and restores focus on Escape", async () => {
  const user = userEvent.setup();
  const { container } = render(<VsCode />);
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Code editor for README.md" }),
    ).toHaveValue(content["README.md"]),
  );
  const trigger = screen.getByRole("button", { name: "Quick Open files" });
  await user.click(trigger);
  const picker = screen.getByRole("combobox", { name: "Quick Open file name" });
  const sidebar = container.firstChild as HTMLElement;
  const before = sidebar.getAttribute("data-sidebar");
  await user.tab();
  expect(picker).toHaveFocus();
  await user.tab({ shift: true });
  expect(picker).toHaveFocus();
  expect(screen.getByRole("dialog", { name: "Quick Open" })).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await user.keyboard("{Control>}b{/Control}");
  expect(sidebar).toHaveAttribute("data-sidebar", before);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
