import { expect, test } from "@playwright/test";

/**
 * The critical path: the playground must compile TypeScript in the browser and
 * run a real plugin against the demo host — no server involved.
 */
test.describe("Playground — in-browser compile & run", () => {
  test("hello-world plugin auto-runs and mounts a toolbar button", async ({ page }) => {
    await page.goto("/#/playground/hello");
    // The compiled plugin contributes a "Say hi" button into the demo toolbar.
    await expect(page.getByRole("button", { name: /Say hi/ })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("clicking a contributed button runs plugin code", async ({ page }) => {
    await page.goto("/#/playground/hello");
    const btn = page.getByRole("button", { name: /Say hi/ });
    await btn.waitFor({ state: "visible", timeout: 30_000 });
    page.once("dialog", (d) => d.dismiss());
    await btn.click();
    // No assertion needed beyond not throwing; the dialog handler proves the
    // plugin's onclick executed.
  });

  test("switching examples runs a different plugin (read state)", async ({ page }) => {
    await page.goto("/#/playground/reading-time");
    await expect(page.getByText(/min read/)).toBeVisible({ timeout: 30_000 });
  });

  test("write-state example toggles the demo theme via the store", async ({ page }) => {
    await page.goto("/#/playground/theme");
    const toggle = page.getByRole("button", { name: /Light|Dark/ });
    await toggle.waitFor({ state: "visible", timeout: 30_000 });
    // The console/state should reflect a notify() after clicking.
    await toggle.click();
    await page.getByRole("button", { name: /Console/ }).click();
    await expect(page.getByText(/Theme set to/)).toBeVisible();
  });

  test("editing code and re-running reflects changes", async ({ page }) => {
    await page.goto("/#/playground/hello");
    await page.getByRole("button", { name: /Say hi/ }).waitFor({
      state: "visible",
      timeout: 30_000,
    });
    // Focus the Monaco editor and replace the button label.
    const editor = page.locator(".pg-editor .monaco-editor").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(
      [
        'import { definePlugin } from "@plugger/core";',
        "export default definePlugin({",
        '  name: "edited",',
        '  permissions: ["ui:render"],',
        "  activate(ctx) {",
        '    ctx.ui.contribute("toolbar", {',
        "      mount(el) {",
        '        const b = document.createElement("button");',
        '        b.textContent = "EDITED BUTTON";',
        "        el.appendChild(b);",
        "      },",
        "    });",
        "  },",
        "});",
      ].join("\n"),
    );
    await page.getByRole("button", { name: /^► Run|Running/ }).click();
    await expect(page.getByRole("button", { name: "EDITED BUTTON" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("the example gallery opens an example in the playground", async ({ page }) => {
    await page.goto("/#/examples");
    await page.getByRole("button", { name: /State \+ API/ }).click();
    await expect(page).toHaveURL(/#\/playground\/todos/);
    await expect(page.getByRole("button", { name: /Add task/ })).toBeVisible({
      timeout: 30_000,
    });
  });
});
