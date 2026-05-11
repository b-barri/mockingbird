import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(page.getByText("Mockingbird")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /talks back/i })
    ).toBeVisible();

    expect(consoleErrors, "no console errors").toEqual([]);
  });

  test("Content-Security-Policy header is present", async ({ request }) => {
    const response = await request.get("/");
    const csp = response.headers()["content-security-policy"];
    expect(csp, "CSP header set").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
});
