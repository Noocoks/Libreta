const { test, expect } = require("@playwright/test");

async function openKnowledgePanel(page) {
    const treeResponse = page.waitForResponse(response =>
        response.url().includes("/res/json/tree.json")
    );
    await page.goto("wiki.html");
    // La respuesta confirma que el árbol se ha cargado; no exigimos nodos,
    // porque un árbol vacío también es una entrada válida para el panel.
    await treeResponse;

    // En móvil el índice es un drawer y se cierra automáticamente al cargar.
    // Abrirlo antes de interactuar con sus controles evita clics fuera del viewport.
    const drawer = page.locator("#tree_panel_toggle_btn");
    const isMobile = await page.evaluate(() => window.matchMedia("(max-width: 900px)").matches);
    if (isMobile) {
        // Esperar a que loadTree aplique el cierre automático del drawer.
        await expect(drawer).toHaveAttribute("aria-expanded", "false");
        await drawer.click();
        await expect(drawer).toHaveAttribute("aria-expanded", "true");
    }

    const panel = page.locator("#knowledge-dashboard");
    await expect(panel).toBeAttached();
    return panel;
}

async function openKnowledgeDashboard(page) {
    const panel = await openKnowledgePanel(page);
    await panel.locator("summary").click();
    await expect(page.locator("#knowledge-dashboard-loading")).toBeHidden();
    return panel;
}

test.describe("Panel de conocimiento", () => {
    test("calcula métricas reales desde el árbol y distribuye el contenido por área", async ({ page }) => {
        await openKnowledgeDashboard(page);

        const expected = await page.evaluate(async () => {
            const response = await fetch("res/json/tree.json");
            const tree = await response.json();
            const count = nodes => nodes.reduce((sum, node) =>
                sum + 1 + count(node.children || []), 0);
            const tagged = nodes => nodes.reduce((sum, node) =>
                sum + ((node.tags || []).length ? 1 : 0) + tagged(node.children || []), 0);
            const tagCounts = new Map();
            const collectTags = nodes => nodes.forEach(node => {
                (node.tags || []).forEach(tag => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
                collectTags(node.children || []);
            });
            collectTags(tree.sections);
            const rankedTags = Array.from(tagCounts.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
            return {
                pages: count(tree.sections),
                areas: tree.sections.length,
                areaNames: tree.sections.map(section => section.name),
                taggedPages: tagged(tree.sections),
                tags: rankedTags
            };
        });

        const metrics = page.locator("#knowledge-dashboard-metrics .knowledge-metric");
        await expect(metrics).toHaveCount(4);
        await expect(metrics.nth(0)).toContainText("Páginas en el índice");
        await expect(metrics.nth(0)).toContainText(String(expected.pages));
        await expect(metrics.nth(1)).toContainText("Áreas principales");
        await expect(metrics.nth(1)).toContainText(String(expected.areas));
        await expect(metrics.nth(2)).toContainText("Páginas etiquetadas");
        await expect(metrics.nth(2)).toContainText(String(expected.taggedPages));
        await expect(metrics.nth(3)).toContainText("Etiquetas únicas");
        await expect(metrics.nth(3)).toContainText(String(expected.tags.length));

        const areaRows = page.locator("#knowledge-dashboard-areas .knowledge-area-row");
        await expect(areaRows).toHaveCount(expected.areas);
        for (let index = 0; index < expected.areas; index++) {
            await expect(areaRows.nth(index)).toContainText(expected.areaNames[index]);
        }

        const renderedTagNames = await page.locator(
            "#knowledge-dashboard-tags .knowledge-tag-name"
        ).allTextContents();
        // El panel puede no tener etiquetas: en ese caso debe mostrar el estado vacío.
        expect(renderedTagNames.length).toBe(Math.min(expected.tags.length, 12));
        expect(renderedTagNames).toEqual(
            expected.tags.slice(0, 12).map(tag => tag.name)
        );
        if (expected.tags.length === 0) {
            await expect(page.locator("#knowledge-dashboard-tags .knowledge-empty"))
                .toHaveText("Todavía no hay etiquetas.");
        } else {
            await expect(page.locator("#knowledge-dashboard-tags .knowledge-empty"))
                .toHaveCount(0);
        }
    });

    test("mantiene el panel operativo cuando el árbol todavía no tiene hojas", async ({ page }) => {
        await page.route("**/res/json/tree.json", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                title: "Árbol inicial",
                sections: []
            })
        }));

        await openKnowledgeDashboard(page);

        const metrics = page.locator("#knowledge-dashboard-metrics .knowledge-metric");
        await expect(metrics).toHaveCount(4);
        await expect(metrics.nth(0)).toContainText("0");
        await expect(metrics.nth(1)).toContainText("0");
        await expect(metrics.nth(2)).toContainText("0");
        await expect(metrics.nth(3)).toContainText("0");
        await expect(page.locator("#knowledge-dashboard-areas .knowledge-area-row"))
            .toHaveCount(0);
        await expect(page.locator("#knowledge-dashboard-tags .knowledge-empty"))
            .toHaveText("Todavía no hay etiquetas.");
        await expect(page.locator("#knowledge-dashboard-error")).toBeHidden();
    });

    test("acepta fichas HTML individuales de la biblioteca sin permitir rutas externas", async ({ page }) => {
        await page.route("**/res/json/tree.json", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                title: "Biblioteca de aplicaciones",
                sections: [{
                    name: "Software",
                    path: "subpags/software/index.html",
                    children: [{
                        name: "Ficha individual",
                        path: "subpags/software/apps/example-app.html"
                    }, {
                        name: "Categoría",
                        path: "subpags/software/categories/utilidades/index.html"
                    }]
                }]
            })
        }));

        await openKnowledgeDashboard(page);

        const metrics = page.locator("#knowledge-dashboard-metrics .knowledge-metric");
        await expect(metrics).toHaveCount(4);
        await expect(metrics.nth(0)).toContainText("3");
        await expect(page.locator("#knowledge-dashboard-areas .knowledge-area-row"))
            .toContainText("Software");
        await expect(page.locator("#knowledge-dashboard-error")).toBeHidden();
    });

    test("rechaza rutas que salen de subpags o no son páginas HTML", async ({ page }) => {
        for (const invalidPath of [
            "../externo/index.html",
            "https://example.invalid/index.html",
            "subpags/software/apps/example.js",
            "subpags/software/apps/%2e%2e/index.html",
            "subpags/software\\\\apps/example.html"
        ]) {
            await page.route("**/res/json/tree.json", route => route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    title: "Prueba",
                    sections: [{ name: "Ruta manipulada", path: invalidPath }]
                })
            }));

            const panel = await openKnowledgePanel(page);
            await panel.locator("summary").click();
            await expect(page.locator("#knowledge-dashboard-error")).toBeVisible();
            await expect(page.locator("#knowledge-dashboard-content")).toBeHidden();
            await page.unroute("**/res/json/tree.json");
            await page.reload();
        }
    });

    test("rechaza un árbol manipulado y no inserta etiquetas como HTML", async ({ page }) => {
        await page.route("**/res/json/tree.json", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                title: "Prueba",
                sections: [{
                    name: "<img src=x onerror=alert(1)>",
                    path: "subpags/test/index.html",
                    tags: ["<svg onload=alert(1)>"]
                }]
            })
        }));

        await openKnowledgeDashboard(page);

        await expect(page.locator("#knowledge-dashboard-areas"))
            .toContainText("<img src=x onerror=alert(1)>");
        await expect(page.locator("#knowledge-dashboard-tags"))
            .toContainText("<svg onload=alert(1)>");
        await expect(page.locator("#knowledge-dashboard-content img, #knowledge-dashboard-content svg"))
            .toHaveCount(0);
    });

    test("muestra un error controlado si el índice contiene rutas no permitidas", async ({ page }) => {
        await page.route("**/res/json/tree.json", route => route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                title: "Prueba",
                sections: [{
                    name: "Área manipulada",
                    path: "../externo/index.html"
                }]
            })
        }));

        const panel = await openKnowledgePanel(page);
        await panel.locator("summary").click();
        await expect(page.locator("#knowledge-dashboard-error")).toBeVisible();
        await expect(page.locator("#knowledge-dashboard-content")).toBeHidden();
        await expect(page.locator("#knowledge-dashboard-retry")).toBeEnabled();
    });
});
