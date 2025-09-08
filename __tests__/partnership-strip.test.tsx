import { render, screen } from "@testing-library/react";
import PartnershipStrip from "@/components/home/PartnershipStrip";

jest.mock("@/content/partners.json", () => [
  { name: "Partner One", logo: "/logo1.png" },
  { name: "Partner Two", logo: "/logo2.png" },
]);

describe("PartnershipStrip", () => {
  it("renders partner logos", () => {
    render(<PartnershipStrip />);
    expect(screen.getByAltText("Partner One")).toBeInTheDocument();
    expect(screen.getByAltText("Partner Two")).toBeInTheDocument();
    expect(screen.getByAltText("Partner One")).toHaveClass("grayscale");
  });
});
