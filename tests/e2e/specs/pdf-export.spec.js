const { test, expect } = require("@playwright/test");

async function openDocument(page) {
    await page.goto("subpags/ciberseguridad/adfb/hydra/index.html");
    await expect(page.locator(".page")).toBeVisible();
    await expect(page.locator(".page-export-button")).toBeVisible();
}

async function openHydraFromWiki(page) {
    await page.goto("wiki.html");
    const drawer = page.locator("#tree_panel_toggle_btn");
    if (await drawer.getAttribute("aria-expanded") === "false") {
        await drawer.click();
        await expect(drawer).toHaveAttribute("aria-expanded", "true");
    }
    await page.locator("#tree_search").fill("Hydra");
    const documentLink = page.locator("#tree_root a").filter({ hasText: "Hydra" }).first();
    await expect(documentLink).toBeVisible();
    await documentLink.click();

    // En móvil el índice sigue siendo un drawer persistente: se cierra
    // explícitamente para que el documento y sus controles queden accesibles.
    if (await page.evaluate(() => window.matchMedia("(max-width: 900px)").matches) &&
        await drawer.getAttribute("aria-expanded") === "true") {
        await drawer.click();
        await expect(drawer).toHaveAttribute("aria-expanded", "false");
    }
}

test.describe("Exportación a PDF", () => {
    test("rechaza solicitudes de impresión con una altura fuera de límite", async ({ page }) => {
        await openHydraFromWiki(page);
        await page.evaluate(() => {
            window.__libretaPrintCalls = 0;
            window.__libretaPrintMessages = 0;
            window.print = () => { window.__libretaPrintCalls += 1; };
            const expectedFrame = document.querySelector("#page_frame");
            window.addEventListener("message", (event) => {
                if (event.source === expectedFrame.contentWindow && event.origin === "null" &&
                    event.data && event.data.type === "print-document")
                    window.__libretaPrintMessages += 1;
                }
            });
        });
        const frame = page.frameLocator("#page_frame");
        await frame.locator("body").evaluate(() => {
            window.parent.postMessage({ type: "print-document", height: 5000001 }, "*");
        });
        await expect.poll(() => page.evaluate(() => window.__libretaPrintMessages)).toBe(1);
        await expect.poll(() => page.evaluate(() => window.__libretaPrintCalls)).toBe(0);
        await expect(page.locator("#pdf-print-confirmation")).toBeHidden();
    });
    test("solicita la impresión a la ventana principal sin relajar la sandbox", async ({ page }) => {
        await openHydraFromWiki(page);

        const frame = page.frameLocator("#page_frame");
        const exportButton = frame.locator(".page-export-button");
        await expect(exportButton).toBeVisible();

        await frame.locator(".page").evaluate((pageElement) => {
            const details = document.createElement("details");
            details.className = "pdf-export-integration-details";
            const summary = document.createElement("summary");
            summary.textContent = "Contenido plegado para la prueba integrada";
            const paragraph = document.createElement("p");
            paragraph.textContent = "Este contenido debe expandirse antes de calcular la altura de impresión.";
            details.append(summary, paragraph);
            pageElement.appendChild(details);
        });
        const printDetails = frame.locator(".pdf-export-integration-details");
        await expect(printDetails).not.toHaveAttribute("open", "");

        await page.evaluate(() => {
            window.__libretaPrintCalls = 0;
            window.__libretaPrintMessages = 0;
            window.print = () => { window.__libretaPrintCalls += 1; };
            const expectedFrame = document.querySelector("#page_frame");
            window.addEventListener("message", (event) => {
                if (event.source === expectedFrame.contentWindow && event.origin === "null" &&
                    event.data && event.data.type === "print-document")
                    window.__libretaPrintMessages += 1;
                }
            });
        });

        await exportButton.click();
        await expect(printDetails).toHaveAttribute("open", "");
        const expectedHeight = await frame.locator(".page").evaluate(() => Math.ceil(Math.max(
            document.documentElement.scrollHeight,
            document.body ? document.body.scrollHeight : 0
        )));
        expect(expectedHeight).toBeGreaterThan(0);
        expect(expectedHeight).toBeLessThanOrEqual(5000000);
        await expect.poll(() => page.evaluate(() => window.__libretaPrintMessages)).toBe(1);
        const confirmPrint = page.locator("#pdf-print-confirmation .pdf-print-confirm");
        await expect(confirmPrint).toBeVisible();
        await expect.poll(() => page.evaluate(() => window.__libretaPrintCalls)).toBe(0);
        await confirmPrint.click();
        await expect.poll(() => page.evaluate(() => window.__libretaPrintCalls)).toBe(1);
        await expect(page.locator("#page_frame")).toHaveAttribute("height", String(expectedHeight));
        await expect(page.locator("#page_frame")).toHaveAttribute("sandbox", "allow-scripts");

        await page.emulateMedia({ media: "print" });
        await expect(page.locator(".tree-panel")).toBeHidden();
        await expect(page.locator("#tree_panel_toggle_btn")).toBeHidden();
        await expect(page.locator("#page_frame")).toBeVisible();

        await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        await expect(printDetails).not.toHaveAttribute("open", "");
        await expect(page.locator("#page_frame")).not.toHaveAttribute("height");
        await expect(page.locator("body")).not.toHaveClass(/printing-document/);
    });

    test("aborta la impresión si no puede preparar el contenido", async ({ page }) => {
        await openDocument(page);
        await page.evaluate(() => {
            window.__libretaPrintMessages = 0;
            const expectedFrame = document.querySelector("#page_frame");
            window.addEventListener("message", (event) => {
                if (event.source === expectedFrame.contentWindow && event.origin === "null" &&
                    event.data && event.data.type === "print-document")
                    window.__libretaPrintMessages += 1;
                }
            });
        });
        await page.locator(".page").evaluate((pageElement) => {
            pageElement.querySelectorAll = function () {
                throw new Error("Fallo de preparación simulado");
            };
        });

        await page.locator(".page-export-button").click();

        expect(await page.evaluate(() => window.__libretaPrintMessages)).toBe(0);
        await expect(page.locator("#pdf-print-confirmation")).toBeHidden();
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
        await page.evaluate(() => { window.print = () => {}; });
        await page.locator(".page-export-button").click();
        await expect(folded).toHaveAttribute("open", "");
        await expect(page.locator(".print-details-content")).toBeVisible();

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

        await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        await expect(folded).not.toHaveAttribute("open", "");
        await expect(page.locator(".print-details-content")).toBeHidden();
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
