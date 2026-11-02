const { test, expect } = require("@playwright/test");

test.describe("Navegación principal", () => {
    test("la portada permite acceder a la wiki y cargar el árbol", async ({ page }) => {
        await page.goto("index.html");

        await expect(page).toHaveTitle(/Libreta/);
        await page.getByRole("link", { name: /Explorar Libreta/ }).click();

        await expect(page).toHaveURL(/\/Libreta\/wiki\.html$/);
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await expect(page.locator("#page_frame")).toBeVisible();
    });

    test("el árbol navega a una página y genera sus migas de pan", async ({ page }) => {
        await page.goto("wiki.html");

        const cyberSecurity = page.locator("#tree_root > li").filter({
            has: page.getByRole("link", { name: "Ciberseguridad", exact: true })
        });

        await expect(cyberSecurity).toBeVisible();
        await cyberSecurity.locator(":scope > button").click();

        await page.getByRole("link", {
            name: "Ataques de fuerza bruta",
            exact: true
        }).click();

        const bruteForce = page.getByRole("link", {
            name: "Ataques de fuerza bruta",
            exact: true
        }).locator("xpath=..");

        await bruteForce.locator(":scope > button").click();
        await page.getByRole("link", { name: "Hydra", exact: true }).click();

        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toHaveText("Hydra");
        await expect(content.locator("#auto-breadcrumb")).toContainText("Ciberseguridad");
        await expect(content.locator("#auto-breadcrumb")).toContainText("Hydra");
    });
});
