const { expect } = require("@playwright/test");

/**
 * Waits for the knowledge tree and verifies its stable top-level areas.
 * New sections may be added without making unrelated navigation tests brittle.
 */
async function expectTreeReady(page) {
    await expect(page.locator(".tree.ready")).toBeVisible();

    const requiredSections = [
        ["ciberseguridad", "Ciberseguridad"],
        ["android", "Android"],
        ["ia", "IA"],
        ["software", "Biblioteca de aplicaciones"],
        ["modding", "Modding"]
    ];

    for (const [category, title] of requiredSections) {
        const node = page.locator(`#tree_root > li[data-cat="${category}"]`);
        await expect(node).toHaveCount(1);
        await expect(node.locator(":scope > a")).toContainText(title);
    }
}

module.exports = { expectTreeReady };
