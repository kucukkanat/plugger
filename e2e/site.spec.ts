import { expect, test } from "@playwright/test";

test.describe("Plugger docs — navigation & chrome", () => {
  test("landing page renders the hero and install command", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Plugins for/i })).toBeVisible();
    await expect(page.getByText("npm install @plugger/core").first()).toBeVisible();
  });

  test("can navigate into the docs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/#\/docs\/introduction/);
    await expect(
      page.getByRole("heading", { name: "What is Plugger?" }),
    ).toBeVisible();
  });

  test("sidebar links switch pages", async ({ page }) => {
    await page.goto("/#/docs/introduction");
    await page.getByRole("link", { name: /Permissions/ }).first().click();
    await expect(page.getByRole("heading", { name: "Permissions", exact: true })).toBeVisible();
    await expect(page.getByText(/PermissionError/).first()).toBeVisible();
  });

  test("theme toggle flips the color scheme", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: /Toggle theme/i }).click();
    const after = await html.getAttribute("data-theme");
    expect(after).not.toBe(before);
  });
});

test.describe("Plugger docs — table of contents", () => {
  test("renders an on-this-page TOC for doc pages", async ({ page }) => {
    await page.goto("/#/docs/plugin-authors");
    await expect(page.getByText("On this page")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "The context API" }),
    ).toBeVisible();
  });
});
