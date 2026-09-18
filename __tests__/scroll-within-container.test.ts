import { scrollWithinContainer } from "../utils/scrollWithinContainer";

describe("application-local scrolling", () => {
  it("scrolls only the app panel, retaining its current scroll offset", () => {
    const container = document.createElement("main");
    const target = document.createElement("section");
    container.append(target);
    container.scrollTop = 120;
    container.scrollTo = jest.fn();
    target.scrollIntoView = jest.fn();
    container.getBoundingClientRect = jest.fn(() => ({ top: 200 }) as DOMRect);
    target.getBoundingClientRect = jest.fn(() => ({ top: 440 }) as DOMRect);
    scrollWithinContainer(container, target);
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 342, behavior: "auto" });
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });
  it("clamps the first section and safely handles missing panels", () => {
    const container = document.createElement("main");
    const target = document.createElement("section");
    container.append(target);
    container.scrollTo = jest.fn();
    scrollWithinContainer(container, target);
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    expect(() => scrollWithinContainer(null, target)).not.toThrow();
    expect(() => scrollWithinContainer(container, null)).not.toThrow();
  });
  it("does not scroll another application's content", () => {
    const container = document.createElement("main");
    container.scrollTo = jest.fn();
    scrollWithinContainer(container, document.createElement("section"));
    expect(container.scrollTo).not.toHaveBeenCalled();
  });
});
