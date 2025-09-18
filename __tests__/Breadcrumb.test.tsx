import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Breadcrumb from "../components/base/Breadcrumb";

describe("Breadcrumb", () => {
  it("navigates when a segment is clicked", () => {
    const handleNavigate = jest.fn();
    render(
      <Breadcrumb
        segments={[
          { id: "root", label: "Root" },
          { id: "folder", label: "Folder" },
        ]}
        onNavigate={handleNavigate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Root" }));

    expect(handleNavigate).toHaveBeenCalledWith(0);
  });

  it("calls onEdit when the path is edited and submitted", async () => {
    const handleEdit = jest.fn().mockResolvedValue(undefined);
    render(
      <Breadcrumb
        segments={[
          { id: "root", label: "Root" },
          { id: "folder", label: "Folder" },
        ]}
        allowEditing
        onEdit={handleEdit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /edit path/i }));
    const input = screen.getByLabelText("Path");
    fireEvent.change(input, { target: { value: "Root/NewFolder" } });

    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(handleEdit).toHaveBeenCalledWith("Root/NewFolder");
    });
  });
});
