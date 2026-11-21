const { test, expect } = require("@playwright/test");

test.describe("Sistema de movimiento", () => {
    test("la portada mantiene su contenido visible y accesible", async ({ page }) => {
        await page.goto("index.html");
        await expect(page.locator(".home-title")).toBeVisible();
        await expect(page.getByRole("link", { name: /Explorar Libreta/ })).toBeVisible();
    });

    test("la navegación de documentos usa estados CSS y no estilos inline", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        const indexToggle = page.locator("#tree_panel_toggle_btn");
        if (await indexToggle.getAttribute("aria-expanded") !== "true") {
            await indexToggle.click();
            await expect(indexToggle).toHaveAttribute("aria-expanded", "true");
        }
        const iframe = page.locator("#page_frame");
        await page.locator("#tree_root > li").first().locator(":scope > a").click();
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toBeVisible();
        await expect(iframe).not.toHaveAttribute("style", /opacity/);
        await expect(page.locator(".page-panel")).not.toHaveClass(/is-loading/);
    });

    test("respeta prefers-reduced-motion en portada y wiki", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("index.html");
        const homeDurations = await page.evaluate(() => {
            return [".home-title", ".home-visual-core"].map((selector) => {
                const style = getComputedStyle(document.querySelector(selector));
                return { animation: style.animationDuration, transition: style.transitionDuration };
            });
        });
        for (const duration of homeDurations) {
            expect(duration.animation.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
            expect(duration.transition.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
        }

        await page.goto("wiki.html");
        await expect(page.locator(".tree.ready #tree_root > li")).toHaveCount(3);
        const wikiDurations = await page.evaluate(() => {
            return [".tree.ready #tree_root > li", ".page-panel iframe"].map((selector) => {
                const style = getComputedStyle(document.querySelector(selector));
                return { animation: style.animationDuration, transition: style.transitionDuration };
            });
        });
        for (const duration of wikiDurations) {
            expect(duration.animation.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
            expect(duration.transition.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
        }
    });
});
});
