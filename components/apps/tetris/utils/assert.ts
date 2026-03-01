export const devAssert = (condition: boolean, message: string) => {
  if (condition) return;
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(message);
  }
};
