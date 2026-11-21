const { test, expect } = require("@playwright/test");

test.describe("Navegación principal", () => {
    test("la portada permite acceder a la wiki y cargar el árbol", async ({ page }) => {
        await page.goto("index.html");

        await expect(page).toHaveTitle(/Libreta/);
        await page.getByRole("link", { name: /Explorar Libreta/ }).click();

        await expect(page).toHaveURL(/\/Libreta\/wiki\.html$/);
        await expect(page.locator("#tree_root > li")).toHaveCount(3);
        await expect(page.locator("#page_frame")).toBeVisible();
    });

    test("el árbol navega a una página y genera sus migas de pan", async ({ page }) => {
        await page.goto("wiki.html");

        // La primera sección del JSON es Ciberseguridad; el enlace lleva un emoji decorativo.
        const cyberSecurity = page.locator("#tree_root > li").first();
        await expect(cyberSecurity.locator(":scope > a")).toContainText("Ciberseguridad");
        await cyberSecurity.locator(":scope > button").click();

        await page.getByRole("link", {
            name: /Ataques de fuerza bruta/
        }).click();

        const bruteForce = page.getByRole("link", {
            name: /Ataques de fuerza bruta/
        }).locator("xpath=..");

        await bruteForce.locator(":scope > button").click();
        await page.getByRole("link", { name: /Hydra/ }).click();

        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toHaveText("Hydra");
        await expect(content.locator("#auto-breadcrumb")).toContainText("Ciberseguridad");
        await expect(content.locator("#auto-breadcrumb")).toContainText("Hydra");
    });
});


test("iframe sandbox isolates documentation without allow-same-origin", async ({ page }) => {
 await page.goto("wiki.html"); const frame=page.locator("#page_frame");
 await expect(frame).toHaveAttribute("sandbox","allow-scripts");
 await expect(frame).toHaveAttribute("referrerpolicy","same-origin");
 const cyberSecurity=page.locator("#tree_root > li").first();
 await cyberSecurity.locator(":scope > button").click();
 await page.getByRole("link",{name:/Ataques de fuerza bruta/}).click();
 const content=page.frameLocator("#page_frame");
 await expect(content.locator("h1").first()).toHaveText("Ataques de fuerza bruta");
 await expect(content.locator("#auto-breadcrumb")).toContainText("Ciberseguridad");
 const isolation=await content.locator("body").evaluate(() => {
  let parentAccess;
  try { void window.parent.document; parentAccess="accessible"; }
  catch (error) { parentAccess=error.name; }
  return parentAccess;
 });
 // Firefox may report the URL origin here; the security boundary is proved by denied DOM access.
 expect(isolation).toBe("SecurityError");
});

test.describe("Validación de mensajes del iframe", () => {
    test("rechaza índices de navegación inválidos y mensajes desconocidos", async ({ page }) => {
        await page.goto("wiki.html");
        const firstSection = page.locator("#tree_root > li").first();
        await expect(firstSection).toBeVisible();
        await firstSection.locator(":scope > a").click();
        const iframe = page.locator("#page_frame");
        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toBeVisible();

        const before = await iframe.getAttribute("src");
        const frame = page.frameLocator("#page_frame");
        await frame.locator("body").evaluate(() => {
            const invalidMessages = [
                { type: "navigate", pathIndex: -1 },
                { type: "navigate", pathIndex: 999999 },
                { type: "navigate", pathIndex: 1.5 },
                { type: "navigate", pathIndex: "0" },
                { type: "navigate", pathIndex: null },
                { type: "navigate", path: "https://attacker.invalid/" },
                { type: "unknown-command", pathIndex: 0 }
            ];
            invalidMessages.forEach((message) => window.parent.postMessage(message, "*"));
        });
        await page.waitForTimeout(150);
        await expect(iframe).toHaveAttribute("src", before);
    });

    test("ignora mensajes falsificados desde la ventana principal", async ({ page }) => {
        await page.goto("wiki.html");
        const firstSection = page.locator("#tree_root > li").first();
        await expect(firstSection).toBeVisible();
        await firstSection.locator(":scope > a").click();
        const iframe = page.locator("#page_frame");
        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toBeVisible();
        const before = await iframe.getAttribute("src");

        await page.evaluate(() => {
            window.dispatchEvent(new MessageEvent("message", {
                data: { type: "navigate", pathIndex: 0 },
                origin: "null"
            }));
        });
        await page.waitForTimeout(100);
        await expect(iframe).toHaveAttribute("src", before);
    });
});

test.describe("Enlaces del contenido", () => {
    test("redirige enlaces internos permitidos a través del router", async ({ page }) => {
        await page.goto("wiki.html");
        const firstSection = page.locator("#tree_root > li").first();
        await expect(firstSection).toBeVisible();
        await firstSection.locator(":scope > a").click();

        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toBeVisible();
        await content.getByRole("link", { name: /Explorar OSINT/ }).click();

        await expect(content.locator("h1").first()).toHaveText("OSINT (Open Source Intelligence)");
        await expect(page).toHaveURL(/#subpags\/ciberseguridad\/osint\/index\.html$/);
    });

    test("conserva enlaces externos sin secuestrar la navegación principal", async ({ page }) => {
        await page.goto("wiki.html");
        const firstSection = page.locator("#tree_root > li").first();
        await expect(firstSection).toBeVisible();
        await firstSection.locator(":scope > a").click();

        const iframe = page.locator("#page_frame");
        const content = page.frameLocator("#page_frame");
        await expect(content.locator("h1").first()).toBeVisible();
        const originalSrc = await iframe.getAttribute("src");
        const originalUrl = page.url();

        await page.route("https://example.org/**", (route) => route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<h1>External destination</h1>"
        }));

        await content.locator("body").evaluate((body) => {
            const link = document.createElement("a");
            link.id = "external-link-security-test";
            link.href = "https://example.org/";
            link.target = "_self";
            link.textContent = "External security test";
            body.appendChild(link);
        });

        await content.locator("#external-link-security-test").click();
        await expect(iframe).toHaveAttribute("src", originalSrc);
        await expect(page).toHaveURL(originalUrl);
    });
});
