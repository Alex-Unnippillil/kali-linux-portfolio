const editorInstance = { dispose: jest.fn() };
export const editor = {
  create: jest.fn(() => editorInstance),
  setTheme: jest.fn(),
};
export default { editor };
