const { PrismaClient } = require("@prisma/client");

let realClient;

function resolveClient() {
  if (process.env.VITEST && globalThis.__VITEST_PRISMA__) {
    return globalThis.__VITEST_PRISMA__;
  }
  if (!realClient) {
    realClient = new PrismaClient();
  }
  return realClient;
}

/**
 * Proxy so unit tests can replace `globalThis.__VITEST_PRISMA__` before each suite;
 * production always uses a real PrismaClient (VITEST is unset).
 */
module.exports = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      const client = resolveClient();
      const value = Reflect.get(client, prop, receiver);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  }
);
