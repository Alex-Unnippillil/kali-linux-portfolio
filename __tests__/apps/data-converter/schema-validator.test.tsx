import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SchemaValidator from "../../../apps/data-converter/components/SchemaValidator";

describe("SchemaValidator", () => {
  it("reports pointers for missing required properties", async () => {
    const user = userEvent.setup();
    render(<SchemaValidator />);

    const sampleInput = screen.getByLabelText(/sample data/i);
    await user.clear(sampleInput);
    fireEvent.change(sampleInput, {
      target: { value: '{\n  "name": "Alex"\n}' },
    });

    await user.click(screen.getByRole("button", { name: /validate/i }));

    const items = await screen.findAllByRole("listitem");
    const ageError = items.find((item) =>
      item.textContent?.toLowerCase().includes("required property 'age'"),
    );
    expect(ageError).toBeDefined();
    expect(ageError?.textContent).toContain("/age");
  });

  it("combines instance paths for nested required errors", async () => {
    const user = userEvent.setup();
    render(<SchemaValidator />);

    const schemaInput = screen.getByLabelText(/json schema/i);
    await user.clear(schemaInput);
    fireEvent.change(
      schemaInput,
      {
        target: {
          value: `{
  "type": "object",
  "properties": {
    "address": {
      "type": "object",
      "properties": {
        "zip": { "type": "string" }
      },
      "required": ["zip"]
    }
  },
  "required": ["address"]
}`,
        },
      },
    );

    const sampleInput = screen.getByLabelText(/sample data/i);
    await user.clear(sampleInput);
    fireEvent.change(sampleInput, {
      target: { value: '{\n  "address": {}\n}' },
    });

    await user.click(screen.getByRole("button", { name: /validate/i }));

    const items = await screen.findAllByRole("listitem");
    const nestedError = items.find((item) =>
      item.textContent?.toLowerCase().includes("required property 'zip'"),
    );
    expect(nestedError).toBeDefined();
    expect(nestedError?.textContent).toContain("/address/zip");
  });
});
