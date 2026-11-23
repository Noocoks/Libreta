const { test, expect } = require("@playwright/test");

async function openKnowledgeDashboard(page) {
    await page.goto("wiki.html");
    const panel = page.locator("#knowledge-dashboard");
    await expect(panel).toBeAttached();
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
            const allTags = new Set();
            const collectTags = nodes => nodes.forEach(node => {
                (node.tags || []).forEach(tag => allTags.add(tag));
                collectTags(node.children || []);
            });
            collectTags(tree.sections);
            return {
                pages: count(tree.sections),
                areas: tree.sections.length,
                taggedPages: tagged(tree.sections),
                tags: allTags.size
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
        await expect(metrics.nth(3)).toContainText(String(expected.tags));

        const areaRows = page.locator("#knowledge-dashboard-areas .knowledge-area-row");
        await expect(areaRows).toHaveCount(expected.areas);
        for (let index = 0; index < expected.areas; index++) {
            await expect(areaRows.nth(index)).toContainText(["Ciberseguridad", "Android", "IA"][index]);
        }
        await expect(page.locator("#knowledge-dashboard-tags .knowledge-tag"))
            .toHaveCount(12);
        await expect(page.locator("#knowledge-dashboard-tags .knowledge-tag").first())
            .toBeVisible();
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

        await page.goto("wiki.html");
        await page.locator("#knowledge-dashboard summary").click();
        await expect(page.locator("#knowledge-dashboard-error")).toBeVisible();
        await expect(page.locator("#knowledge-dashboard-content")).toBeHidden();
        await expect(page.locator("#knowledge-dashboard-retry")).toBeEnabled();
    });
});
