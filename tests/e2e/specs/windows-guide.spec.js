const { test, expect } = require("@playwright/test");

test("Windows aparece en el árbol y la guía se abre correctamente", async ({ page }) => {
    await page.goto("wiki.html");
    const panelToggle = page.locator("#tree_panel_toggle_btn");
    if (await panelToggle.getAttribute("aria-expanded") !== "true") {
        await panelToggle.click();
        await expect(panelToggle).toHaveAttribute("aria-expanded", "true");
    }
    const windowsLink = page.getByRole("link", { name: "Windows", exact: true });
        await expect(windowsLink).toHaveCount(1);
        const windows = windowsLink.locator("xpath=..");
    await expect(windows).toHaveCount(1);
    await windows.locator("button[aria-expanded]").click();
    await windows.getByRole("link", { name: "Guía de aplicaciones", exact: true }).click();
    const frame = page.frameLocator("#page_frame");
    await expect(frame.getByRole("heading", { name: "Guía de aplicaciones imprescindibles para Windows" })).toBeVisible();
    await expect(frame.locator(".windows-category")).toHaveCount(14);
    await expect(frame.getByRole("heading", { name: /Responsively App/ })).toBeVisible();
});
