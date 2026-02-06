import { render, screen, fireEvent } from "@testing-library/react";
import SkillsMap, { SkillGroup } from "../components/SkillsMap";

describe("SkillsMap", () => {
  const groups: SkillGroup[] = [
    {
      name: "Languages",
      skills: [
        {
          name: "JavaScript",
          level: "expert",
          proof: [{ label: "repo", url: "https://example.com/repo" }],
        },
      ],
    },
  ];

  it("shows legend and reveals proof links on click", () => {
    render(<SkillsMap groups={groups} />);

    expect(screen.getByText(/expert/i)).toBeInTheDocument();
    const skill = screen.getByText("JavaScript");
    fireEvent.click(skill);
    expect(screen.getByRole("link", { name: /repo/i })).toBeInTheDocument();
  });
});
