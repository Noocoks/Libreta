const { test, expect } = require("@playwright/test");

test.describe("Buscador y etiquetas", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("wiki.html");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
    });

    test("encuentra nodos por nombre sin distinguir mayúsculas", async ({ page }) => {
        const search = page.locator("#tree_search");

        await search.fill("hYdRa");

        await expect(page.getByRole("link", {
            name: /Hydra/
        })).toBeVisible();
    });

    test("normaliza acentos al buscar etiquetas", async ({ page }) => {
        await page.locator("#tree_search").fill("investigacion");

        await expect(page.getByRole("link", {
            name: /OSINT/
        })).toBeVisible();
    });

    test("limpia la búsqueda y restaura el árbol", async ({ page }) => {
        const search = page.locator("#tree_search");

        await search.fill("Hydra");
        await expect(page.getByRole("link", {
            name: /Hydra/
        })).toBeVisible();

        await page.getByRole("button", { name: "Limpiar búsqueda" }).click();

        await expect(search).toHaveValue("");
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await expect(page.getByRole("link", { name: /Ciberseguridad/ })).toBeVisible();
    });

    test("una etiqueta de la página sincroniza el buscador del índice", async ({ page }) => {
        await page.locator("#tree_search").fill("Hydra");
        await page.getByRole("link", { name: /Hydra/ }).click();

        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toHaveText("Hydra");

        // En viewport móvil el índice se superpone al contenido; ciérralo
        // para que las etiquetas de la página reciban la interacción del usuario.
        const indexToggle = page.locator("#tree_panel_toggle_btn");
        if (
            await indexToggle.isVisible() &&
            await indexToggle.getAttribute("aria-expanded") === "true"
        ) {
            await indexToggle.click();
            await expect(indexToggle).toHaveAttribute("aria-expanded", "false");
        }

        await content.locator(".node-tags .tag").filter({
            hasText: /^pentesting$/
        }).click();

        await expect(page.locator("#tree_search")).toHaveValue("pentesting");
        await expect(page.getByRole("link", {
            name: /Hydra/
        })).toBeVisible();
    });
});
