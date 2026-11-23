const { test, expect } = require("@playwright/test");

async function openWiki(page) {
    await page.goto("wiki.html");
    await expect(page.locator("#tree_root > li")).toHaveCount(3);
    const drawer = page.locator("#tree_panel_toggle_btn");
    if (await drawer.getAttribute("aria-expanded") === "false") {
        await drawer.click();
        await expect(drawer).toHaveAttribute("aria-expanded", "true");
    }
}

async function openRecentPanel(page) {
    const drawer = page.locator("#tree_panel_toggle_btn");
    if (await drawer.getAttribute("aria-expanded") === "false") {
        await drawer.click();
        await expect(drawer).toHaveAttribute("aria-expanded", "true");
    }
    const panel = page.locator("#recent-pages");
    if (!(await panel.evaluate(element => element.open))) {
        await panel.locator("summary").click();
    }
}

async function navigateRootSection(page, index, title) {
    const node = page.locator("#tree_root > li").nth(index);
    await node.locator(":scope > a").click();
    await expect(page.frameLocator("#page_frame").locator("h1").first()).toHaveText(title);
}

test.describe("Historial y navegación inteligente", () => {
    test("registra páginas visitadas y permite volver a ellas", async ({ page }) => {
        await openWiki(page);
        await openRecentPanel(page);
        await expect(page.locator("#recent-pages-empty")).toBeVisible();
        await expect(page.locator("#recent-pages-clear")).toBeDisabled();

        await navigateRootSection(page, 0, "Ciberseguridad");
        await navigateRootSection(page, 1, "Android");
        await openRecentPanel(page);

        const entries = page.locator("#recent-pages-list .recent-page-link");
        await expect(entries).toHaveCount(2);
        await expect(entries.nth(0)).toHaveText("Android");
        await expect(entries.nth(1)).toHaveText("Ciberseguridad");

        await entries.nth(1).click();
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toHaveText("Ciberseguridad");
    });

    test("persiste el historial al recargar y permite limpiarlo", async ({ page }) => {
        await openWiki(page);
        await navigateRootSection(page, 0, "Ciberseguridad");
        await navigateRootSection(page, 1, "Android");
        await page.reload();
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toHaveText("Android");
        await openRecentPanel(page);

        const entries = page.locator("#recent-pages-list .recent-page-link");
        await expect(entries).toHaveCount(2);
        await page.locator("#recent-pages-clear").click();
        await expect(entries).toHaveCount(0);
        await expect(page.locator("#recent-pages-empty")).toBeVisible();
        await expect(page.locator("#recent-pages-clear")).toBeDisabled();
        expect(await page.evaluate(() => localStorage.getItem("libreta.recent-pages.v1"))).toBeNull();
    });

    test("atrás y adelante sincronizan el iframe con la ruta del navegador", async ({ page }) => {
        await openWiki(page);
        const initialHistoryLength = await page.evaluate(() => window.history.length);
        await navigateRootSection(page, 0, "Ciberseguridad");
        await navigateRootSection(page, 1, "Android");
        const navigationState = await page.evaluate(() => ({
            length: window.history.length,
            hash: window.location.hash,
            state: window.history.state
        }));
        expect(navigationState.length).toBeGreaterThanOrEqual(initialHistoryLength + 2);

        await page.evaluate(() => window.history.back());
        await expect(page).toHaveURL(/#subpags\/ciberseguridad\/index\.html$/);
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toHaveText("Ciberseguridad");

        await page.evaluate(() => window.history.forward());
        await expect(page).toHaveURL(/#subpags\/android\/index\.html$/);
        await expect(page.frameLocator("#page_frame").locator("h1").first()).toHaveText("Android");
    });

    test("valida las rutas guardadas y reconstruye los títulos desde el árbol autorizado", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("libreta.recent-pages.v1", JSON.stringify({
                version: 1,
                items: [
                    { path: "subpags/android/index.html", title: "Título falsificado" },
                    { path: "https://attacker.invalid/", title: "Externo" },
                    { path: "subpags/android/index.html", title: "Duplicado" }
                ]
            }));
        });
        await openWiki(page);
        await openRecentPanel(page);

        const entries = page.locator("#recent-pages-list .recent-page-link");
        await expect(entries).toHaveCount(1);
        await expect(entries.first()).toHaveText("Android");
        await expect(entries.first()).toHaveAttribute("title", "subpags/android/index.html");
    });

    test("tolera almacenamiento local con JSON corrupto", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("libreta.recent-pages.v1", "{json roto");
        });
        await openWiki(page);
        await openRecentPanel(page);
        await expect(page.locator("#recent-pages-empty")).toBeVisible();
        await expect(page.locator("#recent-pages-list li")).toHaveCount(0);
    });

    test("limita el historial a ocho páginas y no duplica visitas repetidas", async ({ page }) => {
        await openWiki(page);
        const paths = [
            "subpags/ciberseguridad/index.html",
            "subpags/android/index.html",
            "subpags/ia/index.html",
            "subpags/ciberseguridad/adfb/index.html",
            "subpags/ciberseguridad/adfb/hydra/index.html",
            "subpags/ciberseguridad/adfb/medusa/index.html",
            "subpags/ciberseguridad/efrp/index.html",
            "subpags/ciberseguridad/osint/index.html",
            "subpags/ciberseguridad/phishing/index.html"
        ];
        await page.evaluate(items => {
            items.forEach(path => window.navigate(path, true));
            window.navigate(items[items.length - 1], true);
        }, paths);
        await openRecentPanel(page);

        const entries = page.locator("#recent-pages-list .recent-page-link");
        await expect(entries).toHaveCount(8);
        await expect(entries.first()).toHaveText("Phishing");
        await expect(entries.filter({ hasText: "Ciberseguridad" })).toHaveCount(0);
    });

    test("mantiene la navegación funcional si localStorage está bloqueado", async ({ page }) => {
        await page.addInitScript(() => {
            ["getItem", "setItem", "removeItem"].forEach(method => {
                Object.defineProperty(Storage.prototype, method, {
                    configurable: true,
                    value() { throw new DOMException("Almacenamiento bloqueado", "SecurityError"); }
                });
            });
        });
        await openWiki(page);
        await navigateRootSection(page, 0, "Ciberseguridad");
        await openRecentPanel(page);
        await expect(page.locator("#recent-pages-list .recent-page-link")).toHaveCount(1);
        await expect(page.locator("#recent-pages-list .recent-page-link").first()).toHaveText("Ciberseguridad");
    });
});
