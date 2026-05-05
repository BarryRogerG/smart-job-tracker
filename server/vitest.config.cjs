/** @type {import("vitest").UserConfig} */
module.exports = {
  test: {
    environment: "node",
    include: ["src/**/*.test.mjs"],
    clearMocks: true,
    restoreMocks: true,
  },
};
