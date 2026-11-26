const { test, expect } = require("@playwright/test");


test("el índice de lectura empieza cerrado y los recuentos de aplicaciones se calculan automáticamente", async ({ page }) => {
    await page.goto("subpags/windows/apps/index.html");
    const frame = page.locator("body");
    const readingIndex = frame.locator(".reading-index details");
    await expect(readingIndex).toHaveJSProperty("open", false);

    const categories = frame.locator(".windows-category");
    await expect(categories).toHaveCount(14);

    for (let i = 0; i < await categories.count(); i++) {
        const category = categories.nth(i);
        const count = await category.locator(".windows-app").count();
        await expect(category.locator(".windows-category-count")).toHaveText(
            count + (count === 1 ? " aplicación" : " aplicaciones")
        );
        const categoryId = await category.getAttribute("id");
        await expect(frame.locator('.windows-guide-index a[href="#' + categoryId + '"]')
            .locator("xpath=..").locator(".windows-guide-index-count"))
            .toHaveText("(" + count + ")");
    }
});

test("Windows aparece en el árbol y la guía se abre correctamente", async ({ page }) => {
    await page.goto("wiki.html");
    await expect(page.locator(".tree.ready")).toBeVisible();

    const panelToggle = page.locator("#tree_panel_toggle_btn");
    const treePanel = page.locator(".tree-panel");
    if (await treePanel.evaluate(el => el.classList.contains("hidden"))) {
        await panelToggle.click();
    }
    await expect(treePanel).not.toHaveClass(/hidden/);

    const windowsLink = page.locator('#tree_root > li[data-cat="windows"] > a');
    await expect(windowsLink).toHaveCount(1);
    await expect(windowsLink).toBeVisible();

    const windows = windowsLink.locator("xpath=..");
    await expect(windows).toHaveCount(1);
    await windows.locator("button[aria-expanded]").click();
    await windows.getByRole("link", { name: "Guía de aplicaciones", exact: true }).click();

    const frame = page.frameLocator("#page_frame");
    await expect(frame.getByRole("heading", {
        name: "Guía de aplicaciones imprescindibles para Windows"
    })).toBeVisible();

    const categories = frame.locator(".windows-category");
    await expect(categories).toHaveCount(14);

    const developmentCategory = categories.nth(13);
    const details = developmentCategory.locator("details");
    const summary = details.locator(":scope > summary");

    await summary.scrollIntoViewIfNeeded();

    // En viewport estrecho el clic de puntero sobre el summary no activa
    // consistentemente el comportamiento nativo de <details> en los tres
    // motores. La activación por teclado es el mecanismo nativo y accesible.
    await summary.focus();
    await summary.press("Enter");
    await expect(details).toHaveJSProperty("open", true);

    const responsivelyHeading = developmentCategory.locator(
        ".windows-app h3"
    ).filter({ hasText: "Responsively App" });
    await expect(responsivelyHeading).toHaveCount(1);
    await expect(responsivelyHeading).toBeVisible();
});
