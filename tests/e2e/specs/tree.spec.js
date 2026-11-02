const { test, expect } = require("@playwright/test");

test.describe("Controles del árbol", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
    });

    test("abrir y cerrar todas las ramas actualiza su estado accesible", async ({ page }) => {
        await page.getByRole("button", { name: "Abrir", exact: true }).click();

        const branches = page.locator("#tree_root button[aria-expanded]");
        await expect(branches.first()).toHaveAttribute("aria-expanded", "true");

        await page.getByRole("button", { name: "Cerrar", exact: true }).click();
        await expect(branches.first()).toHaveAttribute("aria-expanded", "false");
    });

    test("el panel lateral se puede ocultar y volver a mostrar", async ({ page }) => {
        const toggle = page.locator("#tree_panel_toggle_btn");

        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator(".tree-panel")).toHaveClass(/hidden/);

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(page.locator(".tree-panel")).not.toHaveClass(/hidden/);
    });
});
