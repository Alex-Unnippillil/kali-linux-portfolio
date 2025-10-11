import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import FigletApp from "../../apps/figlet";

describe("Figlet preview", () => {
  const originalWorker = global.Worker;
  const originalFetch = global.fetch;

  const workers: WorkerMock[] = [];

  class WorkerMock {
    public onmessage: ((event: MessageEvent<any>) => void) | null = null;

    constructor() {
      workers.push(this);
    }

    // eslint-disable-next-line class-methods-use-this
    public terminate() {}

    public postMessage(data: any) {
      if (data.type === "load") {
        this.onmessage?.({
          data: {
            type: "font",
            font: data.name,
            preview: data.name,
            mono: true,
          },
        } as MessageEvent<any>);
        return;
      }

      if (data.type === "render") {
        this.onmessage?.({
          data: {
            type: "render",
            output: `${data.requestId}:${data.font}`,
            requestId: data.requestId,
          },
        } as MessageEvent<any>);
      }
    }
  }

  beforeEach(() => {
    workers.length = 0;
    (global as any).Worker = WorkerMock as unknown as typeof Worker;
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
  });

  afterEach(() => {
    (global as any).Worker = originalWorker;
    (global as any).fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("updates the preview output when font or font size change", async () => {
    render(<FigletApp />);

    const worker = await waitFor(() => {
      const instance = workers[0];
      if (!instance) {
        throw new Error("Worker not ready");
      }
      return instance;
    });

    act(() => {
      worker.onmessage?.({
        data: { type: "font", font: "Standard", preview: "Standard", mono: true },
      } as MessageEvent<any>);
      worker.onmessage?.({
        data: { type: "font", font: "Slant", preview: "Slant", mono: false },
      } as MessageEvent<any>);
    });

    const preview = await screen.findByTestId("figlet-preview");

    await waitFor(() => {
      expect(preview.textContent).toContain("preview:Standard");
    });

    const fontMenu = await screen.findByRole("button", { name: "Standard" });
    fireEvent.click(fontMenu);

    const slantOption = await screen.findByRole("option", { name: "Slant" });
    fireEvent.click(slantOption);

    await waitFor(() => {
      expect(preview.textContent).toContain("preview:Slant");
    });

    const fontSizeSlider = screen.getByLabelText("Font size");
    fireEvent.change(fontSizeSlider, { target: { value: "24" } });

    expect(preview).toHaveStyle({ fontSize: "24px" });
  });
});
