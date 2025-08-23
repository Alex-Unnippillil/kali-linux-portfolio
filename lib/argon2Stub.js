module.exports = {
  ArgonType: { Argon2id: 2 },
  async hash({ pass }) {
    return { encoded: pass };
  },
};
