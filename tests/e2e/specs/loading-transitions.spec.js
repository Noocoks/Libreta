const { test, expect } = require("@playwright/test");

async function fulfillDocumentWithTestOrigin(route, response) {
    const documentResponse = response || await route.fetch();
    const body = (await documentResponse.text()).replaceAll(
        "https://noocoks.github.io",
        "http://127.0.0.1:4173"
    );
    await route.fulfill({ response: documentResponse, body });
}

test.beforeEach(async ({ page }) => {
    await page.route("**/subpags/**/*.html", async (route) => {
        await fulfillDocumentWithTestOrigin(route);
    });
});

async function openFirstSection(page) {
    await page.goto("wiki.html");
    await expect(page.locator("#tree_root > li")).toHaveCount(3);
    await page.evaluate(() => {
        if (!window.navigate("subpags/ciberseguridad/index.html", true)) {
            throw new Error("No se pudo iniciar la navegación de prueba");
        }
    });
    return page;
}

test.describe("Carga y transiciones de documentos", () => {
    test("oculta el indicador cuando el documento real anuncia que está listo", async ({ page }) => {
        await openFirstSection(page);
        const panel = page.locator(".page-panel");
        const overlay = page.locator("#page-load-overlay");
        await expect(panel).toHaveClass(/is-loading|is-entering/);
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toBeVisible();
        const documentFrame = page.frames().find((frame) =>
            frame.url().includes("/subpags/ciberseguridad/index.html")
        );
        expect(documentFrame).toBeTruthy();
        const loadedResources = await documentFrame.evaluate(() => ({
            stylesheet: Array.from(document.styleSheets).some((sheet) =>
                sheet.href && sheet.href.includes("/res/css/styles.css")
            ),
            pageScript: performance.getEntriesByType("resource").some((entry) =>
                entry.name.includes("/res/js/page.js")
            )
        }));
        expect(loadedResources).toEqual({ stylesheet: true, pageScript: true });
        await expect.poll(() => overlay.getAttribute("aria-hidden")).toBe("true");
        await expect(panel).toHaveClass(/is-entering/);
        await expect(panel).not.toHaveClass(/is-loading|is-error/);
    });

    test("mantiene visible la carga durante una respuesta lenta y la retira al terminar", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        let releaseResponse;
        const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
        await page.route("**/subpags/ciberseguridad/index.html", async (route) => {
            const response = await route.fetch();
            await responseGate;
            await fulfillDocumentWithTestOrigin(route, response);
        });

        await page.evaluate(() => window.navigate("subpags/ciberseguridad/index.html", true));
        const panel = page.locator(".page-panel");
        await expect(panel).toHaveClass(/is-loading/);
        await expect(page.locator("#page-load-message")).toBeVisible();
        releaseResponse();

        await expect(page.frameLocator("#page_frame").locator("h1").first()).toBeVisible();
        await expect(panel).toHaveClass(/is-entering/);
        await expect(page.locator("#page-load-overlay")).toHaveAttribute("aria-hidden", "true");
    });

    test("los cambios rápidos no permiten que una página anterior cierre la carga de la actual", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await page.evaluate(() => {
            window.navigate("subpags/ciberseguridad/index.html", true);
            window.navigate("subpags/ciberseguridad/adfb/index.html", true);
        });

        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toHaveText("Ataques de fuerza bruta");
        await expect(page.locator(".page-panel")).toHaveClass(/is-entering/);
        await expect(page.locator(".page-panel")).not.toHaveClass(/is-loading|is-error/);
        await expect(page).toHaveURL(/#subpags\/ciberseguridad\/adfb\/index\.html$/);
    });

    test("muestra un error recuperable si la página no anuncia que está lista", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await page.route("**/subpags/ciberseguridad/index.html", (route) => route.abort());
        await page.evaluate(() => { window.NAVIGATION_LOAD_TIMEOUT = 250; });
        await page.evaluate(() => window.navigate("subpags/ciberseguridad/index.html", true));

        const panel = page.locator(".page-panel");
        await expect(panel).toHaveClass(/is-error/, { timeout: 3000 });
        await expect(page.locator("#page-load-error")).toBeVisible();
        await expect(page.locator("#page-load-retry")).toBeVisible();
        await expect(page.locator(".page-load-spinner")).toBeHidden();
    });

    test("permite reintentar después de un error", async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        let fail = true;
        await page.route("**/subpags/ciberseguridad/index.html", async (route) => {
            if (fail) {
                await route.abort();
                return;
            }
            await fulfillDocumentWithTestOrigin(route);
        });
        await page.evaluate(() => { window.NAVIGATION_LOAD_TIMEOUT = 250; });
        await page.evaluate(() => window.navigate("subpags/ciberseguridad/index.html", true));
        await expect(page.locator(".page-panel")).toHaveClass(/is-error/, { timeout: 3000 });

        fail = false;
        await page.locator("#page-load-retry").click();
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toBeVisible();
        await expect(page.locator(".page-panel")).toHaveClass(/is-entering/);
        await expect(page.locator(".page-panel")).not.toHaveClass(/is-error|is-loading/);
    });

    test("el modo de movimiento reducido desactiva el spinner y la entrada animada", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openFirstSection(page);
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toBeVisible();
        const motion = await page.locator(".page-panel iframe").evaluate((frame) => {
            const style = getComputedStyle(frame);
            const spinner = getComputedStyle(document.querySelector(".page-load-spinner"));
            return {
                animation: style.animationDuration,
                transition: style.transitionDuration,
                spinnerAnimation: spinner.animationDuration
            };
        });
        expect(motion.animation.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
        expect(motion.transition.split(",").every((value) => parseFloat(value) === 0)).toBeTruthy();
        expect(parseFloat(motion.spinnerAnimation)).toBe(0);
    });

    test("el indicador y el botón de recuperación siguen siendo accesibles en móvil", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await page.route("**/subpags/ciberseguridad/index.html", (route) => route.abort());
        await page.evaluate(() => { window.NAVIGATION_LOAD_TIMEOUT = 250; });
        await page.evaluate(() => window.navigate("subpags/ciberseguridad/index.html", true));
        await expect(page.getByRole("alert")).toBeVisible({ timeout: 3000 });
        const retry = page.getByRole("button", { name: "Reintentar" });
        await expect(retry).toBeVisible();
        const box = await retry.boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390);
    });
});
