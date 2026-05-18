const { Builder, Browser } = require('selenium-webdriver');

async function createDriver() {
    // Configure Chrome options (headless by default for automated testing)
    const chrome = require('selenium-webdriver/chrome');
    const options = new chrome.Options();
    
    // Uncomment the next line to run headlessly (useful for CI)
    // options.addArguments('--headless');
    
    // Required to bypass some automated testing restrictions in Chrome
    options.addArguments('--disable-search-engine-choice-screen');
    options.addArguments('--start-maximized');

    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(options)
        .build();

    // Slow down each action by 800ms so you can watch every step clearly
    await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000 });
    
    // Note: selenium-webdriver doesn't have built-in slowMo like Puppeteer,
    // but we handle this with explicit pauses in the tests themselves.
    
    return driver;
}

module.exports = { createDriver };
