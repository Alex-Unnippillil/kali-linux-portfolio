import React from "react";
import { render, screen } from "@testing-library/react";
import { createDynamicApp } from "../utils/createDynamicApp";

jest.mock("next/dynamic", () => {
  return (importer: () => Promise<any>) => {
    let Loaded: any = null;
    return function DynamicComponent(props: any) {
      if (!Loaded) {
        throw importer().then((mod) => {
          Loaded = mod.default || mod;
        });
      }
      const C = Loaded;
      return <C {...props} />;
    };
  };
});

describe("createDynamicApp", () => {
  it("renders fallback when app fails to load", async () => {
    const BrokenApp = createDynamicApp("missing-app", "Missing App");
    render(
      <div>
        <span>Shell Ready</span>
        <React.Suspense fallback={null}>
          <BrokenApp />
        </React.Suspense>
      </div>,
    );
    expect(screen.getByText("Shell Ready")).toBeInTheDocument();
    expect(
      await screen.findByText("Unable to load Missing App"),
    ).toBeInTheDocument();
  });
});
