const { test, expect } = require("@playwright/test");
const { expectTreeReady } = require("../helpers/tree");

async function openNavigation(page) {
    const toggle = page.locator("#tree_panel_toggle_btn");
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

test.describe("Selector de facetas", () => {
    test("escritorio: abre un panel superpuesto y cambia de faceta", async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.goto("wiki.html");
        await expectTreeReady(page);
        const trigger = page.getByRole("button", { name: /LIBRETA \/ VISTAS/ });
        await expect(trigger).toBeVisible();
        await trigger.click();
        const menu = page.locator("#facet-menu");
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute("role", "dialog");
        const menuBounds = await menu.boundingBox();
        const menuIsPainted = await page.evaluate(({ x, y }) => {
            const element = document.elementFromPoint(x, y);
            return Boolean(element && element.closest("#facet-menu"));
        }, { x: menuBounds.x + menuBounds.width - 12, y: menuBounds.y + 12 });
        expect(menuIsPainted).toBe(true);
        await menu.getByRole("button", { name: /Biblioteca de aplicaciones/ }).click();
        await expect(page.locator("#facet-heading")).toHaveText("// BIBLIOTECA");
        await expect(page.locator('#tree_root > li[data-cat="software"]')).toBeVisible();
        await expect(page.locator('#tree_root > li[data-cat="modding"]')).toBeHidden();
    });

    test("móvil: el menú ocupa todo el viewport y permanece oculto al cerrarse", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("wiki.html");
        await expectTreeReady(page);
        await openNavigation(page);
        const trigger = page.locator("#facet-trigger");
        await expect(trigger).toBeVisible();
        await trigger.click();
        const menu = page.locator("#facet-menu");
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute("aria-modal", "true");
        expect(await menu.evaluate(element => element.parentElement === document.body)).toBe(true);
        const triggerBounds = await trigger.boundingBox();
        expect(triggerBounds).not.toBeNull();
        expect(triggerBounds.height).toBeLessThan(56);
        const bounds = await menu.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(390);
        expect(bounds.height).toBe(844);
        await menu.getByRole("button", { name: /Diccionario técnico/ }).click();
        await expect(menu).toBeHidden();
        await expect(menu).toHaveAttribute("aria-modal", "false");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toBeVisible();
        await expect(page.locator("#facet-heading")).toHaveText("// DICCIONARIO");
        await expect(page.locator("#facet-secondary-view")).toBeVisible();
        await expect(page.locator(".facet-dictionary-entry").first()).toBeVisible();
        await page.locator(".facet-dictionary-search").fill("KERNEL");
        await expect(page.locator(".facet-dictionary-term")).toHaveText("Kernel");
        await expect(page.locator(".facet-dictionary-term")).toHaveAttribute("aria-expanded", "false");
        await page.locator(".facet-dictionary-term").click();
        await expect(page.locator(".facet-dictionary-term")).toHaveAttribute("aria-expanded", "true");
        await expect(page.locator(".facet-dictionary-definition")).toContainText("Parte central del sistema operativo");
        await expect(page.locator(".facet-dictionary-related")).toBeVisible();
        await page.locator(".facet-dictionary-related button", { hasText: "Namespace" }).click();
        await expect(page.locator(".facet-dictionary-term")).toHaveText("Namespace");
        await page.locator(".facet-dictionary-search").fill("Sistemas");
        await expect(page.locator(".facet-dictionary-status")).not.toHaveText("0 conceptos");
    });

    test("el diccionario recuerda la última faceta y los artículos no aparecen en el árbol", async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.goto("wiki.html");
        await expectTreeReady(page);
        await page.locator("#facet-trigger").click();
        await page.locator("#facet-menu").getByRole("button", { name: /Diccionario técnico/ }).click();
        await expect(page.locator("#facet-heading")).toHaveText("// DICCIONARIO");
        await page.reload();
        await expectTreeReady(page);
        await expect(page.locator("#facet-heading")).toHaveText("Diccionario");
        await expect(page.locator("#tree_root")).toBeHidden();
        await expect(page.locator("#facet-secondary-view")).toBeVisible();
    });

    test("Escape cierra el selector y devuelve el foco al activador", async ({ page }) => {
        await page.goto("wiki.html");
        await expectTreeReady(page);
        await page.locator("#facet-trigger").click();
        await expect(page.locator("#facet-menu")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator("#facet-menu")).toBeHidden();
        await expect(page.locator("#facet-trigger")).toBeFocused();
    });
    test("primera aparición: una sola definición interactiva por ficha", async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.goto("wiki.html");
        await expectTreeReady(page);
        await page.locator("#tree_search").fill("Docker Desktop");
        const appLink = page.getByRole("link", { name: /Docker Desktop/ });
        await expect(appLink).toBeVisible();
        await appLink.click();
        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toHaveText("Docker Desktop");
        const term = content.locator('.glossary-term[data-concept-id="contenedor"]');
        await expect(term).toHaveCount(1);
        await expect(term).toHaveText("contenedores");
        await expect(content.locator('.glossary-term[data-concept-id="namespace"]')).toHaveCount(1);
        await expect(content.locator('.glossary-term[data-concept-id="cgroups"]')).toHaveCount(1);
        await term.focus();
        await expect(term).toHaveAttribute("aria-expanded", "false");
        await term.press("Enter");
        await expect(term).toHaveAttribute("aria-expanded", "true");
        await expect(term).toHaveAttribute("aria-label", /Entorno de ejecución aislado/);
    });

});
