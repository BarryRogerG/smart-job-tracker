import { createRequire } from "node:module";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

globalThis.__VITEST_PRISMA__ = prismaMock;

const { registerUser, loginUser } = require("./auth.service.js");

afterAll(() => {
  delete globalThis.__VITEST_PRISMA__;
});

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("throws 409 when email already exists", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: "existing", email: "a@b.com" });

      await expect(
        registerUser({ email: "a@b.com", password: "secret", name: "N" })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Email is already registered",
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("hashes password, creates user, and returns a JWT", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: "new-id",
        email: "new@example.com",
        name: "Tester",
      });

      const result = await registerUser({
        email: "new@example.com",
        password: "plain",
        name: "Tester",
      });

      expect(prismaMock.user.create).toHaveBeenCalled();
      const createArg = prismaMock.user.create.mock.calls[0][0];
      expect(createArg.data.email).toBe("new@example.com");
      expect(await bcrypt.compare("plain", createArg.data.passwordHash)).toBe(true);

      expect(result.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(result.user).toEqual({
        id: "new-id",
        email: "new@example.com",
        name: "Tester",
      });
    });
  });

  describe("loginUser", () => {
    it("throws 401 when user is not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        loginUser({ email: "ghost@example.com", password: "x" })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid credentials",
      });
    });

    it("throws 401 when password does not match", async () => {
      const passwordHash = await bcrypt.hash("right-password", 8);
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash,
        name: "A",
      });

      await expect(loginUser({ email: "a@b.com", password: "wrong" })).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid credentials",
      });
    });

    it("returns user and token when credentials are valid", async () => {
      const passwordHash = await bcrypt.hash("correct", 8);
      prismaMock.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash,
        name: "Alice",
      });

      const result = await loginUser({ email: "a@b.com", password: "correct" });

      expect(result.user).toEqual({
        id: "u1",
        email: "a@b.com",
        name: "Alice",
      });
      expect(result.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });
  });
});
