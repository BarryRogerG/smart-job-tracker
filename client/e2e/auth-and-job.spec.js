const { test, expect } = require("@playwright/test");

const API_BASE = process.env.PLAYWRIGHT_API_BASE || "http://127.0.0.1:5000";

test.describe("core flows", () => {
  test("login and create job from dashboard", async ({ page, request }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "password12";

    const registerRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email,
        password,
        name: "E2E User",
      },
    });
    expect(registerRes.ok(), await registerRes.text()).toBeTruthy();

    await page.goto("/login");

    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    });

    const company = `E2E Co ${Date.now()}`;
    await page.getByPlaceholder("Company").fill(company);
    await page.getByPlaceholder("Role").fill("Engineer");
    await page.getByRole("button", { name: "Create Job" }).click();

    await expect(page.getByText(company)).toBeVisible({ timeout: 15_000 });
  });
});
