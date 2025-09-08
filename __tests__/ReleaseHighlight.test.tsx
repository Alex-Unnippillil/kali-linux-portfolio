import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReleaseHighlight from "@/components/home/ReleaseHighlight";

jest.mock("@/data/kali-blog.json", () => [
  {
    title: "Kali Linux 2025.2 Release",
    link: "https://example.com/2025.2",
    date: "2025-06-13",
  },
  {
    title: "Kali Linux 2025.1 Release",
    link: "https://example.com/2025.1",
    date: "2025-03-19",
  },
]);

describe("ReleaseHighlight", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders latest release and dismisses", async () => {
    render(<ReleaseHighlight />);
    const link = await screen.findByRole("link", {
      name: /kali linux 2025.2 release/i,
    });
    expect(link).toHaveAttribute("href", "https://example.com/2025.2");

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole("link", {
          name: /kali linux 2025.2 release/i,
        }),
      ).toBeNull(),
    );
    expect(localStorage.getItem("release-highlight-dismissed")).toBe(
      "https://example.com/2025.2",
    );
  });
});

