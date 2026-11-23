const { test, expect } = require("@playwright/test");

async function openCodeDocument(page) {
    await page.goto("subpags/ciberseguridad/adfb/hydra/index.html");
    await expect(page.locator(".page")).toBeVisible();
    await expect(page.locator(".page .code-block-toolbar").first()).toBeVisible();
}

test.describe("Bloques de código avanzados", () => {
    test("adapta bloques pre existentes aunque no tengan un elemento code", async ({ page }) => {
        await openCodeDocument(page);

        const firstPre = page.locator(".page pre").first();
        await expect(firstPre.locator(":scope > code")).toHaveCount(1);
        await expect(firstPre.locator("code")).not.toBeEmpty();
        await expect(firstPre.locator("code .code-line")).not.toHaveCount(0);
        await expect(firstPre.locator("code .code-token-keyword")).toHaveCount(0);
        await expect(page.locator(".code-block-copy").first()).toHaveText("Copiar");
    });

    test("infiere el lenguaje, resalta sintaxis y copia el texto original sin controles", async ({ page }) => {
        await openCodeDocument(page);

        const source = 'const value = "<img src=x onerror=alert(1)>";\nreturn value;\n';
        await page.locator(".page").evaluate((text) => {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.className = "language-javascript";
            code.textContent = text;
            pre.appendChild(code);
            document.querySelector(".page").appendChild(pre);
            Object.defineProperty(navigator, "clipboard", {
                configurable: true,
                value: {
                    writeText: async (value) => { window.__libretaCopiedCode = value; }
                }
            });
            window.initCodeBlocks();
        }, source);

        const block = page.locator(".page .code-block-shell").last();
        const toolbar = page.locator(".page .code-block-toolbar").last();
        await expect(toolbar.locator(".code-block-language")).toHaveText("JavaScript");
        await expect(block.locator(".code-token-keyword").first()).toHaveText("const");
        await expect(block.locator(".code-token-string")).toContainText("<img");
        await expect(block.locator("img, script")).toHaveCount(0);

        const toggle = toolbar.locator(".code-block-lines-toggle");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-pressed", "true");
        await expect(block.locator(".code-block-line-gutter li")).toHaveCount(2);

        await toolbar.locator(".code-block-copy").click();
        await expect.poll(() => page.evaluate(() => window.__libretaCopiedCode)).toBe(source);
        await expect(toolbar.locator(".code-block-copy")).toHaveText("Copiado");
    });

    test("pliega bloques largos y permite desplegarlos con teclado o ratón", async ({ page }) => {
        await openCodeDocument(page);

        await page.locator(".page").evaluate(() => {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.className = "language-python";
            code.textContent = Array.from({ length: 20 }, (_, index) => "print(" + index + ")").join("\n");
            pre.appendChild(code);
            document.querySelector(".page").appendChild(pre);
            window.initCodeBlocks();
        });

        const fold = page.locator(".page .code-block-fold").last();
        await expect(fold).toBeAttached();
        await expect(fold).not.toHaveAttribute("open", "");
        await expect(fold.locator("summary")).toContainText("Python");
        await expect(fold.locator("summary")).toContainText("20 líneas");
        await fold.locator("summary").focus();
        await page.keyboard.press("Enter");
        await expect(fold).toHaveAttribute("open", "");
        await expect(fold.locator(".code-line")).toHaveCount(20);
        await expect(fold.locator(".code-block-lines-toggle")).toBeVisible();
    });

    test("usa el fallback de portapapeles cuando la API moderna falla", async ({ page }) => {
        await openCodeDocument(page);

        const source = "echo 'fallback seguro'";
        await page.locator(".page").evaluate((text) => {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.className = "language-bash";
            code.textContent = text;
            pre.appendChild(code);
            document.querySelector(".page").appendChild(pre);

            Object.defineProperty(navigator, "clipboard", {
                configurable: true,
                value: { writeText: () => Promise.reject(new Error("clipboard denied")) }
            });
            document.execCommand = (command) => {
                if (command !== "copy") return false;
                const fallback = document.querySelector("textarea.code-copy-fallback");
                window.__libretaFallbackWasTextarea = Boolean(fallback && fallback.tagName === "TEXTAREA");
                window.__libretaFallbackCopied = fallback ? fallback.value : null;
                return true;
            };
            window.initCodeBlocks();
        }, source);

        const toolbar = page.locator(".page .code-block-toolbar").last();
        await toolbar.locator(".code-block-copy").click();
        await expect.poll(() => page.evaluate(() => window.__libretaFallbackWasTextarea)).toBe(true);
        await expect.poll(() => page.evaluate(() => window.__libretaFallbackCopied)).toBe(source);
        await expect(toolbar.locator(".code-block-copy")).toHaveText("Copiado");
        await expect(page.locator(".code-copy-fallback")).toHaveCount(0);
    });

    test("mantiene controles utilizables en móvil y no añade scripts ni estilos inline", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openCodeDocument(page);

        const toolbar = page.locator(".page .code-block-toolbar").first();
        await expect(toolbar.locator("button")).toHaveCount(2);
        const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
        expect(policy).toContain("script-src-attr 'none'");
        expect(policy).toContain("style-src-attr 'none'");
        await expect(page.locator(".page [style]")).toHaveCount(0);
    });
});
