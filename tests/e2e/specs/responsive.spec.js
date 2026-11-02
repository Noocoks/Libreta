const { test, expect } = require("@playwright/test");

const viewports = [
    { name: "móvil pequeño", width: 320, height: 640 },
    { name: "móvil", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "portátil", width: 1366, height: 768 }
];

for (const viewport of viewports) {
    test(`el control del índice permanece accesible en ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
        });

        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);

        const toggle = page.locator("#tree_panel_toggle_btn");
        await expect(toggle).toBeVisible();

        const bounds = await toggle.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
    });
}
