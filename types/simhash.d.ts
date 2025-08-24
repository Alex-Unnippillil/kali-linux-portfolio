declare module 'simhash' {
  export default function createSimhash(algo?: string): (tokens: string[]) => number[];
}
