import React from "react";
import { render, screen, act } from "@testing-library/react";
import HealthChip from "../components/util-components/health-chip";

describe("HealthChip", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("updates chip on service state changes", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", impactedFeatures: [] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "down", impactedFeatures: ["API"] }),
      } as any);

    render(<HealthChip />);

    expect(await screen.findByText("OK")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(await screen.findByText("Down")).toBeInTheDocument();
    expect(screen.getByText("Down")).toHaveAttribute("title", "API");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
