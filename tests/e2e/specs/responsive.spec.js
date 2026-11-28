const { test, expect } = require("@playwright/test");
const { expectTreeReady } = require("../helpers/tree");

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
        await expectTreeReady(page);

        const toggle = page.locator("#tree_panel_toggle_btn");
        await expect(toggle).toBeVisible();
        // En móvil/tablet se prioriza el contenido; en escritorio se conserva el índice abierto.
        const mobileLayout = viewport.width <= 900;
        const initialExpanded = mobileLayout ? "false" : "true";
        await expect(toggle).toHaveAttribute("aria-expanded", initialExpanded);
        if (mobileLayout) {
            await expect(page.locator(".tree-panel")).toHaveClass(/hidden/);
        } else {
            await expect(page.locator(".tree-panel")).not.toHaveClass(/hidden/);
        }

        const bounds = await toggle.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", mobileLayout ? "true" : "false");
        if (mobileLayout) {
            await expect(page.locator(".tree-panel")).not.toHaveClass(/hidden/);
            const drawer = await page.locator(".tree-panel").boundingBox();
            expect(drawer.x).toBe(0);
            expect(drawer.width).toBeLessThanOrEqual(Math.min(viewport.width * 0.82, 320) + 1);
        } else {
            await expect(page.locator(".tree-panel")).toHaveClass(/hidden/);
        }
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", initialExpanded);
        if (mobileLayout) {
            await expect(page.locator(".tree-panel")).toHaveClass(/hidden/);
            const layout = await page.evaluate(() => ({
                viewportWidth: document.documentElement.clientWidth,
                documentWidth: document.documentElement.scrollWidth,
                contentWidth: document.querySelector(".page-panel").getBoundingClientRect().width,
                iframeWidth: document.querySelector("#page_frame").getBoundingClientRect().width
            }));
            expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
            expect(layout.contentWidth).toBeCloseTo(viewport.width, 0);
            expect(layout.iframeWidth).toBeCloseTo(viewport.width, 0);
        } else {
            await expect(page.locator(".tree-panel")).not.toHaveClass(/hidden/);
        }
    });
}
