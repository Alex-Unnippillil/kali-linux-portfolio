import { fireEvent, render, screen } from "@testing-library/react";
import StepsTabs from "../components/StepsTabs";

const TABS = [
  { id: "linux", label: "Linux", code: "echo linux" },
  { id: "windows", label: "Windows", code: "echo win" },
];

describe("StepsTabs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers last selected tab via localStorage", () => {
    const { unmount } = render(<StepsTabs tabs={TABS} storageKey="os" />);
    fireEvent.click(screen.getByRole("tab", { name: /Windows/i }));
    expect(localStorage.getItem("os")).toBe("windows");
    unmount();
    render(<StepsTabs tabs={TABS} storageKey="os" />);
    expect(screen.getByRole("tab", { name: /Windows/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("supports arrow key navigation", () => {
    render(<StepsTabs tabs={TABS} storageKey="os" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    const winTab = screen.getByRole("tab", { name: /Windows/i });
    expect(winTab).toHaveAttribute("aria-selected", "true");
    expect(winTab).toHaveFocus();
  });
});

