import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import VisualBuilder from "@/apps/subnet-calculator/components/VisualBuilder";

describe("VisualBuilder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders IPv4 defaults", () => {
    render(<VisualBuilder />);

    const slider = screen.getByTestId("prefix-slider") as HTMLInputElement;
    expect(slider.value).toBe("20");

    const row0 = within(screen.getByTestId("subnet-row-0"));
    expect(row0.getByText("10.0.0.0/20")).toBeInTheDocument();
    expect(row0.getByText("10.0.0.0")).toBeInTheDocument();
    expect(row0.getByText("10.0.15.255")).toBeInTheDocument();
    expect(row0.getByText("4,094")).toBeInTheDocument();

    const blocks = screen.getAllByTestId("diagram-block");
    expect(blocks).toHaveLength(16);
    expect(screen.queryByTestId("diagram-summary")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-summary")).toHaveTextContent("Showing 8 of 16 subnets");
  });

  it("updates subnet data when the slider moves", () => {
    const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    render(<VisualBuilder />);

    const slider = screen.getByTestId("prefix-slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "18" } });

    expect(rafSpy).toHaveBeenCalled();
    expect(slider.value).toBe("18");

    const row0 = within(screen.getByTestId("subnet-row-0"));
    expect(row0.getByText("10.0.0.0/18")).toBeInTheDocument();
    expect(row0.getByText("10.0.63.255")).toBeInTheDocument();
    expect(row0.getByText("16,382")).toBeInTheDocument();

    const blocks = screen.getAllByTestId("diagram-block");
    expect(blocks).toHaveLength(4);

  });

  it("switches to IPv6 presets", async () => {
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    render(<VisualBuilder />);

    const ipv6Tab = screen.getByRole("tab", { name: /ipv6/i });
    fireEvent.click(ipv6Tab);

    const slider = screen.getByTestId("prefix-slider") as HTMLInputElement;
    await waitFor(() => expect(slider.value).toBe("56"));

    const row0 = within(screen.getByTestId("subnet-row-0"));
    expect(row0.getByText("2001:db8::/56")).toBeInTheDocument();
    expect(row0.getByText("2001:db8::")).toBeInTheDocument();
    expect(row0.getByText("2001:db8:0:ff:ffff:ffff:ffff:ffff")).toBeInTheDocument();

    expect(screen.getByTestId("table-summary")).toHaveTextContent("Showing 8 of 256 subnets");
    expect(screen.getByTestId("diagram-summary")).toHaveTextContent("+ 240 more segments");

    const blocks = screen.getAllByTestId("diagram-block");
    expect(blocks).toHaveLength(16);
  });
});
