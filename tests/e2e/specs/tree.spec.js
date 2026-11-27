const { test, expect } = require("@playwright/test");
const { expectTreeReady } = require("../helpers/tree");

test.describe("Controles del árbol", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("wiki.html");
        await expectTreeReady(page);
    });

    test("abrir y cerrar todas las ramas actualiza su estado accesible", async ({ page }) => {
        const indexToggle = page.locator("#tree_panel_toggle_btn");
        if (await indexToggle.getAttribute("aria-expanded") !== "true") await indexToggle.click();
        await page.getByRole("button", { name: "Abrir", exact: true }).click();

        const branches = page.locator("#tree_root button[aria-expanded]");
        await expect(branches.first()).toHaveAttribute("aria-expanded", "true");

        await page.getByRole("button", { name: "Cerrar", exact: true }).click();
        await expect(branches.first()).toHaveAttribute("aria-expanded", "false");
    });

    test("el panel lateral se puede ocultar y volver a mostrar", async ({ page }) => {
        const toggle = page.locator("#tree_panel_toggle_btn");

        await expect(toggle).toBeVisible();
        const mobileLayout = await page.evaluate(() => window.matchMedia("(max-width: 900px)").matches);
        const initialExpanded = mobileLayout ? "false" : "true";
        await expect(toggle).toHaveAttribute("aria-expanded", initialExpanded);

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", mobileLayout ? "true" : "false");

        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", initialExpanded);
    });
    test("Biblioteca de aplicaciones aparece en el árbol y abre su catálogo", async ({ page }) => {
        await expect(page.locator(".tree.ready")).toBeVisible();
        const panelToggle = page.locator("#tree_panel_toggle_btn");
        const treePanel = page.locator(".tree-panel");
        if (await treePanel.evaluate(el => el.classList.contains("hidden"))) {
            await panelToggle.click();
        }
        await expect(treePanel).not.toHaveClass(/hidden/);

        const libraryNode = page.locator('#tree_root > li[data-cat="software"]');
        await expect(libraryNode).toHaveCount(1);
        await expect(libraryNode.locator(":scope > a")).toBeVisible();

        const branchToggle = libraryNode.locator(":scope > button[aria-expanded]");
        await expect(branchToggle).toHaveCount(1);
        await branchToggle.click();

        const catalogLink = libraryNode.locator(":scope > ul.subtree > li > a").filter({ hasText: "Catálogo de aplicaciones" });
        await expect(catalogLink).toBeVisible();
        await catalogLink.click();

        const catalog = page.frameLocator("#page_frame");
        await expect(catalog.getByRole("heading", { name: "Biblioteca de aplicaciones", exact: true })).toBeVisible();
        await expect(catalog.locator(".library-category")).toHaveCount(16);
    });

    test("Modding aparece como sección independiente y ofrece sus plataformas", async ({ page }) => {
        await expectTreeReady(page);

        const moddingNode = page.locator('#tree_root > li[data-cat="modding"]');
        await expect(moddingNode).toHaveCount(1);
        await expect(moddingNode.locator(":scope > a")).toBeVisible();

        const branchToggle = moddingNode.locator(":scope > button[aria-expanded]");
        await expect(branchToggle).toHaveCount(1);
        await branchToggle.click();

        for (const platform of ["Windows", "Linux", "Android"]) {
            await expect(moddingNode.locator(":scope > ul.subtree > li > a").filter({ hasText: platform })).toBeVisible();
        }

        await moddingNode.locator(":scope > a").click();
        const content = page.frameLocator("#page_frame");
        await expect(content.getByRole("heading", { name: "Modding", exact: true })).toBeVisible();

        const cards = content.locator(".modding-card");
        await expect(cards).toHaveCount(14);
        for (const project of ["AtlasOS", "Ubuntu", "Linux Mint", "Kali Linux", "Arch Linux", "BlackArch", "Fedora", "Red Hat Enterprise Linux", "Debian", "Parrot OS", "CachyOS", "SteamOS", "LineageOS", "crDroid"]) {
            await expect(cards.filter({ hasText: project })).toHaveCount(1);
        }
    });

});