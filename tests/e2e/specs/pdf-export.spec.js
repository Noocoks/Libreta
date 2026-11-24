const { test, expect } = require("@playwright/test");

async function openDocument(page) {
    await page.goto("subpags/ciberseguridad/adfb/hydra/index.html");
    await expect(page.locator(".page")).toBeVisible();
    await expect(page.locator(".page-export-button")).toBeVisible();
}

test.describe("Exportación a PDF", () => {
    test("abre el diálogo nativo únicamente tras una acción explícita", async ({ page }) => {
        await openDocument(page);

        await page.evaluate(() => {
            window.__libretaPrintCalls = 0;
            window.print = () => { window.__libretaPrintCalls += 1; };
        });

        await expect.poll(() => page.evaluate(() => window.__libretaPrintCalls)).toBe(0);
        await page.locator(".page-export-button").click();
        await expect.poll(() => page.evaluate(() => window.__libretaPrintCalls)).toBe(1);
        await expect(page.locator(".page-export-button")).toHaveText("Imprimir / Guardar como PDF");
    });

    test("oculta controles y prepara documentos plegados para impresión", async ({ page }) => {
        await openDocument(page);

        await page.locator(".page").evaluate((pageElement) => {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.className = "language-python";
            code.textContent = Array.from({ length: 22 }, (_, index) => "print(" + index + ")").join("\n");
            pre.appendChild(code);
            pageElement.appendChild(pre);

            const details = document.createElement("details");
            const summary = document.createElement("summary");
            summary.textContent = "Contenido desplegable de prueba";
            const paragraph = document.createElement("p");
            paragraph.className = "print-details-content";
            paragraph.textContent = "Este contenido debe aparecer en el documento impreso.";
            details.appendChild(summary);
            details.appendChild(paragraph);
            pageElement.appendChild(details);
            window.initCodeBlocks();
        });

        const folded = page.locator(".page .code-block-fold").last();
        await expect(folded).toBeAttached();
        await expect(folded).not.toHaveAttribute("open", "");

        await page.emulateMedia({ media: "print" });

        await expect(page.locator(".page-export-toolbar")).toBeHidden();
        await expect(page.locator(".code-block-toolbar").last()).toBeHidden();
        await expect(page.locator(".reading-progress")).toBeHidden();
        await expect(page.locator(".print-details-content")).toBeVisible();
        await expect(folded.locator(".code-line").first()).toBeVisible();

        const printRules = await page.evaluate(() => {
            const heading = document.querySelector(".page h2");
            const table = document.createElement("table");
            const row = document.createElement("tr");
            table.appendChild(row);
            document.querySelector(".page").appendChild(table);
            return {
                headingBreakAfter: getComputedStyle(heading).breakAfter,
                rowBreakInside: getComputedStyle(row).breakInside,
                codeWhiteSpace: getComputedStyle(document.querySelector(".page pre")).whiteSpace,
                pagePadding: getComputedStyle(document.querySelector(".page")).padding
            };
        });

        expect(printRules.headingBreakAfter).toContain("avoid");
        expect(printRules.rowBreakInside).toBe("avoid");
        expect(printRules.codeWhiteSpace).toBe("pre-wrap");
        expect(printRules.pagePadding).toBe("0px");
    });

    test("mantiene la acción accesible en móvil y no introduce estilos inline", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openDocument(page);

        const button = page.locator(".page-export-button");
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute("type", "button");

        const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
        expect(policy).toContain("script-src-attr 'none'");
        expect(policy).toContain("style-src-attr 'none'");
        await expect(page.locator(".page [style]")).toHaveCount(0);
    });
});
