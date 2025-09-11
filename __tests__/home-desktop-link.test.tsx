import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "../pages/index";

describe("Home page desktop link", () => {
  it("links to the desktop page", () => {
    render(<Home desktops={[]} posts={[]} />);
    const link = screen.getByRole("link", { name: /launch desktop/i });
    expect(link).toHaveAttribute("href", "/desktop");
  });
});
