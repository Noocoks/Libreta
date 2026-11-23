const { test, expect } = require("@playwright/test");

async function openDocument(page) {
    await page.goto("wiki.html");
    await expect(page.locator("#tree_root > li")).toHaveCount(3);
    await page.locator("#tree_root > li").first().locator(":scope > a").evaluate(link => link.click());
    await expect(page.frameLocator("#page_frame").locator(".page")).toBeVisible();
}

test.describe("Índice dinámico de lectura", () => {
    test("genera un índice con los encabezados reales y permite navegar por ancla", async ({ page }) => {
        await openDocument(page);
        const frame = page.frameLocator("#page_frame");
        const headings = frame.locator(".page h2, .page h3, .page h4");
        const index = frame.locator(".reading-index");

        if (await headings.count()) {
            await expect(index).toBeVisible();
            await expect(index.locator("a")).toHaveCount(await headings.count());
            const target = index.locator("a").last();
            const href = await target.getAttribute("href");
            expect(href).toMatch(/^#/);
            await target.click();
            await expect(target).toHaveAttribute("aria-current", "location");
        } else {
            await expect(index).toHaveCount(0);
        }
    });

    test("crea IDs únicos sin alterar IDs existentes y omite encabezados vacíos", async ({ page }) => {
        await openDocument(page);
        const frame = page.frameLocator("#page_frame");
        await frame.locator(".page").evaluate(pageRoot => {
            const first = document.createElement("h2");
            first.id = "legacy-section";
            first.textContent = "Sección repetida";
            const second = document.createElement("h3");
            second.id = "legacy-section";
            second.textContent = "Sección repetida";
            const empty = document.createElement("h4");
            empty.textContent = "   ";
            pageRoot.append(first, second, empty);
            window.initReadingIndex();
        });

        const ids = await frame.locator(".reading-index a").evaluateAll(links =>
            links.map(link => decodeURIComponent(link.hash.slice(1)))
        );
        expect(ids).toContain("legacy-section");
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.some(id => id.startsWith("seccion-repetida"))).toBeTruthy();
        await expect(frame.locator(".reading-index a").filter({ hasText: /^\s*$/ })).toHaveCount(0);
    });

    test("muestra un progreso accesible y lo actualiza al desplazarse", async ({ page }) => {
        await openDocument(page);
        const frame = page.frameLocator("#page_frame");
        const progress = frame.locator(".reading-progress");
        await expect(progress).toHaveAttribute("role", "progressbar");
        await expect(progress).toHaveAttribute("aria-valuenow", /\\d+/);
        await frame.locator(".page").evaluate(element => {
            for (let i = 0; i < 80; i++) {
                const paragraph = document.createElement("p");
                paragraph.textContent = "Contenido de prueba para ampliar la altura del documento y comprobar el progreso de lectura.";
                element.appendChild(paragraph);
            }
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
            window.dispatchEvent(new Event("scroll"));
        });
        await expect(progress).toBeVisible();
        await expect(progress).toHaveAttribute("aria-valuenow", "100");
    });

    test("no crea controles si el documento no contiene encabezados útiles", async ({ page }) => {
        await openDocument(page);
        const frame = page.frameLocator("#page_frame");
        await frame.locator(".page").evaluate(element => {
            element.querySelectorAll("h2, h3, h4").forEach(heading => heading.remove());
            window.initReadingIndex();
        });
        await expect(frame.locator(".reading-index")).toHaveCount(0);
        await expect(frame.locator(".reading-progress")).toHaveCount(0);
    });
});
