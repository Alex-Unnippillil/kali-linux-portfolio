import { render, screen } from "@testing-library/react";
import KaliEverywhere from "@/components/home/KaliEverywhere";

jest.mock("@/content/platforms.json", () => [
  {
    icon: "🐧",
    title: "Penguin",
    description: "Test platform",
    href: "https://example.com/docs",
  },
]);

describe("KaliEverywhere", () => {
  it("renders platform cards with icon, description and docs link", () => {
    render(<KaliEverywhere />);
    expect(screen.getByText("🐧")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Penguin" })
    ).toBeInTheDocument();
    expect(screen.getByText("Test platform")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /docs/i });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
  });
});
