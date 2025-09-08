import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaliEverywhere from "../components/home/KaliEverywhere";

test("renders WSL and Containers badges with correct links", () => {
  render(<KaliEverywhere />);

  const wslBadge = screen.getByRole("img", { name: /WSL badge/i });
  expect(wslBadge).toBeInTheDocument();
  const wslLink = wslBadge.closest("a");
  expect(wslLink).toHaveAttribute("target", "_blank");
  expect(wslLink).toHaveAttribute("rel", "noopener");

  const containersBadge = screen.getByRole("img", { name: /Containers badge/i });
  expect(containersBadge).toBeInTheDocument();
  const containersLink = containersBadge.closest("a");
  expect(containersLink).toHaveAttribute("target", "_blank");
  expect(containersLink).toHaveAttribute("rel", "noopener");
});
