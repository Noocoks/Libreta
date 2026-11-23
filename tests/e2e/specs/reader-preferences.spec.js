const { test, expect } = require("@playwright/test");

async function openFirstDocument(page) {
    await page.goto("wiki.html");
    await expect(page.locator("#tree_root > li")).toHaveCount(3);

    // Trigger the actual navigation handler without relying on the tree's
    // entrance animation or the link's viewport position.
    await page.locator("#tree_root > li").first().locator(":scope > a")
        .evaluate(element => element.click());

    await expect(page.frameLocator("#page_frame").locator(".page")).toBeVisible();

    // The controls live inside a native <details>; open it before interacting.
    await page.locator("#reader-settings")
        .evaluate(details => { details.open = true; });
    await expect(page.locator("#reader-settings-content")).toBeVisible().catch(() => {});
    await expect(page.locator("#reader-textSize")).toBeVisible();
}

test.describe("Preferencias de lectura", () => {
    test.beforeEach(async ({ page }) => {
        await openFirstDocument(page);
    });

    test("permite ajustar texto, anchura y espaciado en el documento", async ({ page }) => {
        const content = page.frameLocator("#page_frame").locator(".page");

        await page.locator("#reader-textSize").selectOption("large");
        await page.locator("#reader-readingWidth").selectOption("compact");
        await page.locator("#reader-spacing").selectOption("relaxed");

        await expect(content).toHaveAttribute("data-text-size", "large");
        await expect(content).toHaveAttribute("data-reading-width", "compact");
        await expect(content).toHaveAttribute("data-spacing", "relaxed");
        await expect(page.locator("#reader-settings-status")).toContainText("actualizadas");
    });

    test("persiste preferencias tras recargar la wiki", async ({ page }) => {
        await page.locator("#reader-textSize").selectOption("large");
        await page.locator("#reader-readingWidth").selectOption("wide");
        await page.locator("#reader-spacing").selectOption("compact");

        await openFirstDocument(page);

        await expect(page.locator("#reader-textSize")).toHaveValue("large");
        await expect(page.locator("#reader-readingWidth")).toHaveValue("wide");
        await expect(page.locator("#reader-spacing")).toHaveValue("compact");

        const content = page.frameLocator("#page_frame").locator(".page");
        await expect(content).toHaveAttribute("data-text-size", "large");
        await expect(content).toHaveAttribute("data-reading-width", "wide");
        await expect(content).toHaveAttribute("data-spacing", "compact");
    });

    test("restablece los valores predeterminados", async ({ page }) => {
        await page.locator("#reader-textSize").selectOption("large");
        await page.locator("#reader-settings-reset").click();

        await expect(page.locator("#reader-textSize")).toHaveValue("normal");
        await expect(page.locator("#reader-readingWidth")).toHaveValue("normal");
        await expect(page.locator("#reader-spacing")).toHaveValue("normal");

        const content = page.frameLocator("#page_frame").locator(".page");
        await expect(content).toHaveAttribute("data-text-size", "normal");
        await expect(content).toHaveAttribute("data-reading-width", "normal");
        await expect(content).toHaveAttribute("data-spacing", "normal");
    });

    test("recupera valores por defecto si el almacenamiento contiene datos inválidos", async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem("libreta.reader-preferences.v1", JSON.stringify({
                textSize: "gigante",
                readingWidth: "javascript:",
                spacing: null,
                extra: "ignored"
            }));
        });

        await openFirstDocument(page);
        await expect(page.locator("#reader-textSize")).toHaveValue("normal");
        await expect(page.locator("#reader-readingWidth")).toHaveValue("normal");
        await expect(page.locator("#reader-spacing")).toHaveValue("normal");

        const content = page.frameLocator("#page_frame").locator(".page");
        await expect(content).toHaveAttribute("data-text-size", "normal");
        await expect(content).toHaveAttribute("data-reading-width", "normal");
        await expect(content).toHaveAttribute("data-spacing", "normal");
    });
});
