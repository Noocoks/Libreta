const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests/e2e/specs",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [
        ["list"],
        ["html", {
            outputFolder: "playwright-report",
            open: "never"
        }]
    ],
    use: {
        baseURL: "http://127.0.0.1:4173/Libreta/",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        ...devices["Desktop Chrome"]
    },
    webServer: {
        command: "python3 tests/e2e/server.py",
        url: "http://127.0.0.1:4173/Libreta/",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000
    }
});
