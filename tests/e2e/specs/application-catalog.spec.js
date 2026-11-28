const { test, expect } = require("@playwright/test");

test.describe("Biblioteca de aplicaciones", () => {
    test("el catálogo refleja el total, no incluye apps solo de pago y carga logotipos SVG locales", async ({ page }) => {
        await page.goto("subpags/software/apps/index.html");
        await expect(page.locator("#application-results")).toContainText("108 aplicaciones disponibles");
        await expect(page.locator("[data-app-card]")).toHaveCount(108);
        for (const slug of ["mydockfinder", "wallpaper-engine", "lossless-scaling", "anima-engine", "file-pilot"]) {
            await expect(page.locator('[data-app-card] a[href="./' + slug + '.html"]')).toHaveCount(0);
        }
        const category = page.locator("#library-category-8 details");
        await category.locator("summary").click();
        const blenderCard = page.locator('[data-app-card] a[href="./blender.html"]').locator("..");
        const logo = blenderCard.locator("img.library-app-logo");
        await expect(logo).toBeVisible();
        await expect(logo).toHaveAttribute("src", "/Libreta/images/apps/blender.svg");
        await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    });

    test("las nuevas aplicaciones aparecen en sus fichas técnicas y categorías", async ({ page }) => {
        await page.goto("subpags/software/apps/index.html");
        for (const slug of ["mixxx", "inkscape", "freecad", "kdenlive", "dbeaver-community", "joplin", "vscodium", "kde-connect", "syncthing"]) {
            await expect(page.locator('[data-app-card] a[href="./' + slug + '.html"]')).toHaveCount(1);
        }
    });
});
