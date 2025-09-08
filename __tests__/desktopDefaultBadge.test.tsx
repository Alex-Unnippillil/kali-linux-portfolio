import React from "react";
import { render, screen, within } from "@testing-library/react";
import Home from "../pages/index.jsx";

describe("Choose your desktop row", () => {
  test("marks Xfce as the default desktop environment", () => {
    const placeholder = "data:image/png;base64,abc";
    const desktops = [
      {
        name: "Xfce",
        image: "/xfce.png",
        blurDataURL: placeholder,
        default: true,
      },
      { name: "GNOME", image: "/gnome.png", blurDataURL: placeholder },
    ];

    render(<Home desktops={desktops} />);
    const xfceCard = screen.getByLabelText(
      /Xfce desktop environment \(default\)/i,
      { selector: "div" },
    );
    expect(within(xfceCard).getByText(/Default/i)).toBeInTheDocument();
  });
});
