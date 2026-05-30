const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testRegister() {
    let options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        console.log("Navigating to register.html...");
        await driver.get('http://localhost:3000/register.html');
        
        console.log("Filling fields...");
        await driver.findElement(By.id('firstNameInput')).sendKeys('Test');
        await driver.findElement(By.id('lastNameInput')).sendKeys('User');
        
        const email = `test_${Date.now()}@ceylon.lk`;
        console.log("Email:", email);
        await driver.findElement(By.id('emailInput')).sendKeys(email);
        await driver.findElement(By.id('passwordInput')).sendKeys('Pass123!');
        await driver.findElement(By.id('confirmPasswordInput')).sendKeys('Pass123!');
        
        const submitBtn = await driver.findElement(By.css('#registerForm button[type="submit"]'));
        await driver.executeScript('arguments[0].scrollIntoView(true);', submitBtn);
        await submitBtn.click();
        
        console.log("Waiting 3s for redirect...");
        await new Promise(r => setTimeout(r, 3000));
        
        const url = await driver.getCurrentUrl();
        console.log("Current URL after register:", url);
        
        const errorMsg = await driver.findElement(By.id('errorMsg'));
        const isDisp = await errorMsg.isDisplayed();
        if (isDisp) {
            console.log("Error message displayed:", await errorMsg.getText());
        }
        
        const logs = await driver.manage().logs().get('browser');
        console.log("Browser Logs:", logs);
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await driver.quit();
    }
}

testRegister();
