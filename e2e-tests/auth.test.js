const { By, until } = require('selenium-webdriver');
const { createDriver } = require('./driverSetup');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

describe('Authentication Flow', () => {
    let driver;
    // Default to the file URL for local testing, can be overridden by environment variable
    const frontendPath = path.resolve(__dirname, '../frontend');
    const loginUrl = process.env.FRONTEND_URL 
        ? `${process.env.FRONTEND_URL}/login.html` 
        : `file://${frontendPath}/login.html`;

    beforeAll(async () => {
        driver = await createDriver();
    });

    afterAll(async () => {
        if (driver) {
            await driver.quit();
        }
    });

    test('should load the login page successfully', async () => {
        console.log('\n  🌐 [STEP] Navigating to login.html...');
        await driver.get(loginUrl);
        await sleep(1500);
        
        console.log('  ⏳ [STEP] Waiting for #loginForm to appear...');
        await driver.wait(until.elementLocated(By.id('loginForm')), 5000);
        await sleep(800);
        
        const title = await driver.getTitle();
        console.log(`  📄 [CHECK] Page title is: "${title}"`);
        expect(title).toBe('Login - Ceylon Track');
        
        const emailInput = await driver.findElement(By.id('email'));
        expect(emailInput).toBeDefined();
        await sleep(800);
        console.log('  ✅ [PASS] Login page loaded. Email input found.');
    });

    test('should show error for invalid credentials', async () => {
        console.log('\n  🌐 [STEP] Navigating to login.html...');
        await driver.get(loginUrl);
        await sleep(1500);
        
        const emailInput = await driver.findElement(By.id('email'));
        const passwordInput = await driver.findElement(By.id('password'));
        const loginBtn = await driver.findElement(By.id('loginBtn'));

        console.log('  ⌨️  [STEP] Typing invalid credentials...');
        await emailInput.sendKeys('invalid@example.com');
        await sleep(600);
        await passwordInput.sendKeys('wrongpassword');
        await sleep(600);

        console.log('  🖱️  [STEP] Clicking login button...');
        await loginBtn.click();

        console.log('  ⏳ [STEP] Waiting for error message to appear...');
        const errorMsg = await driver.wait(until.elementLocated(By.id('errorMessage')), 5000);
        await driver.wait(until.elementIsVisible(errorMsg), 5000);
        await sleep(1500);
        
        const text = await errorMsg.getText();
        console.log(`  📋 [CHECK] Error message text: "${text}"`);
        expect(text.length).toBeGreaterThan(0);
        console.log('  ✅ [PASS] Error message displayed correctly.');
    });
});
