import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SkipLinks from "../components/SkipLinks";

test("first tab focuses skip to desktop link", async () => {
  const user = userEvent.setup();
  const { getByText } = render(<SkipLinks />);
  await user.tab();
  const link = getByText("Skip to desktop");
  expect(link).toHaveFocus();
  expect(link).toBeVisible();
});

