const { By, until } = require('selenium-webdriver');

const BASE = 'http://localhost:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(emoji, msg) {
  console.log(`\n  ${emoji}  ${msg}`);
}

const CREDS = {
  passenger: { email: 'passenger@ceylon.lk', password: 'Pass123!' },
  staff: { email: 'staff@ceylon.lk', password: 'Staff123!' },
  admin: { email: 'admin@ceylon.lk', password: 'Admin123!' }
};

/**
 * Performs a login for a specific user role.
 * Navigates to login.html, selects the appropriate tab, fills inputs, and submits.
 */
async function loginAs(driver, role) {
  const creds = CREDS[role];
  if (!creds) {
    throw new Error(`Unknown role for login: ${role}`);
  }

  log('🔐', `Logging in as ${role} (${creds.email})...`);
  await driver.get(`${BASE}/login.html`);
  await sleep(1000);

  // Clear localStorage/sessionStorage from previous states
  await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
  await driver.get(`${BASE}/login.html`);
  await sleep(1000);

  // Wait for login form
  await driver.wait(until.elementLocated(By.id('loginForm')), 10000);

  // Click appropriate tab
  const tab = await driver.findElement(By.css(`.auth-tab[data-role="${role}"]`));
  await tab.click();
  await sleep(500);

  // Fill credentials
  const identifierInput = await driver.findElement(By.id('identifierInput'));
  await identifierInput.clear();
  await identifierInput.sendKeys(creds.email);
  await sleep(300);

  const passwordInput = await driver.findElement(By.id('passwordInput'));
  await passwordInput.clear();
  await passwordInput.sendKeys(creds.password);
  await sleep(300);

  // Submit
  const submitBtn = await driver.findElement(By.css('#loginForm button[type="submit"]'));
  await submitBtn.click();
  
  // Wait for page transition or redirect depending on role
  await sleep(2000);
}

module.exports = { BASE, sleep, log, CREDS, loginAs };
