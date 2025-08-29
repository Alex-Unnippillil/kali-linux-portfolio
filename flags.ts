import { flag } from "flags/next";

export const beta = flag<boolean>({
  key: "beta",
  description: "Enable Beta UI elements and flows",
  origin: "https://vercel.com/dashboard",
  defaultValue: false,
  async decide() {
    return false;
  },
});
