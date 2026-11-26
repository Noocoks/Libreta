const { test, expect } = require("@playwright/test");

test.describe("Sistema de movimiento", () => {
    test("la portada mantiene su contenido visible y accesible", async ({ page }) => {
        await page.goto("index.html");
        await expect(page.locator(".home-title")).toBeVisible();
        await expect(page.getByRole("link", { name: /Explorar Libreta/ })).toBeVisible();
    });

    test("el hero visual compone sus capas de movimiento sin ocultar el contenido", async ({ page }) => {
        await page.goto("index.html");
        const motion = await page.evaluate(() => {
            const card = document.querySelector(".home-visual-card");
            const core = document.querySelector(".home-visual-core");
            return {
                cardAnimation: getComputedStyle(card).animationName,
                cardSweep: getComputedStyle(card, "::after").animationName,
                cardSweepLayer: getComputedStyle(card, "::after").zIndex,
                corePulse: getComputedStyle(core, "::before").animationName,
                outerOrbit: getComputedStyle(document.querySelector(".home-visual-orbit--outer")).animationName,
                titleAnimation: getComputedStyle(document.querySelector(".home-title span")).animationName,
                compactViewport: window.matchMedia("(max-width: 600px)").matches
            };
        });

        expect(motion.cardAnimation).toContain("libreta-enter");
        expect(motion.cardAnimation).toContain("libreta-card-drift");
        // En móvil se desactiva deliberadamente el barrido para reducir
        // movimiento decorativo y trabajo de composición en pantallas pequeñas.
        expect(motion.cardSweep).toBe(motion.compactViewport ? "none" : "libreta-scan");
        expect(motion.cardSweepLayer).toBe("0");
        expect(motion.corePulse).toBe("libreta-ring-pulse");
        expect(motion.outerOrbit).toBe("home-orbit");
        expect(motion.titleAnimation).toBe("libreta-title-sheen");
    });

    test("la navegación de documentos usa estados CSS y no estilos inline", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(4);
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
            return [".home-title", ".home-visual-core", ".home-visual-card"].map((selector) => {
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
