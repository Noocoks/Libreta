const { test, expect } = require("@playwright/test");

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
    await summary.click();
    await expect(details).toHaveJSProperty("open", true);

    const responsivelyHeading = developmentCategory.locator(
        ".windows-app h3"
    ).filter({ hasText: "Responsively App" });
    await expect(responsivelyHeading).toHaveCount(1);
    await expect(responsivelyHeading).toBeVisible();
});
