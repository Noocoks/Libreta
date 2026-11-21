const { test, expect } = require("@playwright/test");

test.describe("Política CSP", () => {
    test("bloquea scripts inline y manejadores HTML", async ({ page }) => {
        await page.goto("wiki.html");
        const result = await page.evaluate(() => {
            window.__libretaInlineProbe = false;
            const script = document.createElement("script");
            script.textContent = "window.__libretaInlineProbe = true";
            document.body.appendChild(script);

            const button = document.createElement("button");
            button.id = "csp-handler-probe";
            button.setAttribute("onclick", "window.__libretaHandlerProbe = true");
            document.body.appendChild(button);
            button.click();

            return {
                scriptExecuted: window.__libretaInlineProbe,
                handlerExecuted: window.__libretaHandlerProbe === true
            };
        });
        expect(result.scriptExecuted).toBe(false);
        expect(result.handlerExecuted).toBe(false);
    });

    test("bloquea estilos inline y elementos style inyectados", async ({ page }) => {
        await page.goto("wiki.html");
        const result = await page.evaluate(() => {
            const probe = document.createElement("div");
            probe.id = "csp-style-probe";
            probe.textContent = "visible";
            document.body.appendChild(probe);
            probe.setAttribute("style", "display:none !important");

            const style = document.createElement("style");
            style.textContent = "#csp-style-probe { visibility:hidden !important; }";
            document.head.appendChild(style);

            const computed = getComputedStyle(probe);
            return {
                display: computed.display,
                visibility: computed.visibility,
                policy: document.querySelector('meta[http-equiv="Content-Security-Policy"]').content
            };
        });
        expect(result.display).not.toBe("none");
        expect(result.visibility).not.toBe("hidden");
        expect(result.policy).not.toContain("unsafe-inline");
    });

    test("la política estricta se declara en todas las páginas publicadas", async ({ page }) => {
        await page.goto("wiki.html");
        const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
        expect(policy).toContain("script-src-attr 'none'");
        expect(policy).toContain("style-src-attr 'none'");
        expect(policy).toContain("object-src 'none'");
        expect(policy).toContain("base-uri 'self'");
    });

    test("renderiza estadísticas como texto, nunca como HTML", async ({ page }) => {
        const hostileLabel = '<img src=x onerror="window.__statsInjected = true">';
        let intercepted = false;
        await page.route(/project-stats\.json/, (route) => {
            intercepted = true;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                total_files: 1,
                total_lines: 10,
                counting: "non-empty lines",
                generated_at: "2026-11-20T18:42:13+00:00",
                languages: [{ key: "test", label: hostileLabel, files: 1, lines: 10 }]
            })
            });
        });
        const statsResponse = page.waitForResponse(/project-stats\.json/);
        await page.goto("wiki.html");
        await statsResponse;
        await expect.poll(() => intercepted).toBe(true);
        await page.locator(".project-stats-trigger").evaluate((button) => button.focus());
        await expect(page.locator(".project-stats-data")).toBeVisible();
        await expect(page.locator(".project-stats-languages")).toContainText(hostileLabel);
        await expect(page.locator(".project-stats-languages img")).toHaveCount(0);
        expect(await page.evaluate(() => window.__statsInjected === true)).toBe(false);
    });

    test("rechaza respuestas de estadísticas demasiado grandes", async ({ page }) => {
        let intercepted = false;
        const consoleErrors = [];
        page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => consoleErrors.push(error.message));
        await page.route(/project-stats\.json/, (route) => {
            intercepted = true;
            return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                total_files: 1,
                total_lines: 1,
                counting: "non-empty lines",
                generated_at: "2026-11-20T18:42:13+00:00",
                languages: [{ key: "html", label: "HTML", files: 1, lines: 1 }],
                padding: "x".repeat(40 * 1024)
            })
            });
        });
        const statsResponse = page.waitForResponse(/project-stats\.json/);
        await page.goto("wiki.html");
        await statsResponse;
        await expect.poll(() => intercepted).toBe(true);
        await page.locator(".project-stats-trigger").evaluate((button) => button.focus());
        await expect(page.locator(".project-stats-error")).toBeVisible();
        await expect(page.locator(".project-stats-loading")).toBeHidden();
    });

});
