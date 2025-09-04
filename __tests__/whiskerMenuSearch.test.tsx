import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AllApplications from "../components/screen/all-applications";

test('Terminal ranks highest when searching "ter"', async () => {
  const apps = [
    {
      id: "terminal",
      title: "Terminal",
      icon: "",
      disabled: false,
      favourite: true,
    },
    {
      id: "serial-terminal",
      title: "Serial Terminal",
      icon: "",
      disabled: false,
      favourite: false,
    },
    {
      id: "tetris",
      title: "Tetris",
      icon: "",
      disabled: false,
      favourite: false,
    },
  ];
  const { container } = render(
    <AllApplications apps={apps} games={[]} openApp={() => {}} />,
  );
  await screen.findByLabelText("Terminal");
  const input = screen.getByPlaceholderText("Search");
  await userEvent.type(input, "ter");
  await new Promise((r) => setTimeout(r, 100));
  const appNodes = container.querySelectorAll("[data-app-id]");
  expect(appNodes[0].getAttribute("data-app-id")).toBe("terminal");
});
