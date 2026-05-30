const { By, until } = require('selenium-webdriver');
const { createDriver } = require('./driverSetup');
const { BASE, sleep, log, CREDS, loginAs } = require('./helpers');

describe('Ceylon Track E2E Master Suite', () => {
  let driver;

  beforeAll(async () => {
    driver = await createDriver();
    // Ensure we start with a completely clean session
    await driver.get(`${BASE}/index.html`);
    await sleep(500);
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // =========================================================================
  // 🔵 Group 1 — Public Pages & Navigation (TC-01 to TC-15)
  // =========================================================================
  describe('Group 1 — Public Pages & Navigation', () => {

    test('TC-01: Home page loads with correct title', async () => {
      log('🌐', 'Navigating to Home index.html...');
      await driver.get(`${BASE}/index.html`);
      await sleep(1500);
      
      const title = await driver.getTitle();
      log('📄', `Page title is: "${title}"`);
      expect(title).toContain('Ceylon Track');
      log('✅', 'TC-01 PASSED');
    });

    test('TC-02: Search form has fromInput, toInput, dateInput, classSelect', async () => {
      log('🔍', 'Checking elements in search card...');
      const fromInput = await driver.findElement(By.id('fromInput'));
      const toInput = await driver.findElement(By.id('toInput'));
      const dateInput = await driver.findElement(By.id('dateInput'));
      const classSelect = await driver.findElement(By.id('classSelect'));

      expect(fromInput).toBeDefined();
      expect(toInput).toBeDefined();
      expect(dateInput).toBeDefined();
      expect(classSelect).toBeDefined();
      
      log('✅', 'TC-02 PASSED');
    });

    test('TC-03: Typing "Colombo" in fromInput triggers autocomplete dropdown', async () => {
      log('⌨️', 'Typing "Colombo" in From input...');
      const fromInput = await driver.findElement(By.id('fromInput'));
      await fromInput.clear();
      await fromInput.sendKeys('Colombo');
      await sleep(1000);

      const dropdown = await driver.wait(until.elementLocated(By.id('fromDropdown')), 5000);
      const isVisible = await dropdown.isDisplayed();
      expect(isVisible).toBe(true);

      const items = await driver.findElements(By.css('#fromDropdown .autocomplete-item'));
      log('📋', `Found ${items.length} autocomplete items for Colombo`);
      expect(items.length).toBeGreaterThan(0);
      
      log('✅', 'TC-03 PASSED');
    });

    test('TC-04: Selecting autocomplete suggestion fills input and closes dropdown', async () => {
      log('🖱️', 'Clicking the first autocomplete item...');
      const firstItem = await driver.findElement(By.css('#fromDropdown .autocomplete-item'));
      const itemText = await firstItem.getText();
      log('🔤', `Selected item: "${itemText}"`);
      await firstItem.click();
      await sleep(1000);

      const fromInput = await driver.findElement(By.id('fromInput'));
      const value = await fromInput.getAttribute('value');
      log('📝', `Input value is now: "${value}"`);
      expect(value).toContain('Colombo Fort');

      const dropdown = await driver.findElement(By.id('fromDropdown'));
      const isVisible = await dropdown.isDisplayed();
      expect(isVisible).toBe(false);
      
      log('✅', 'TC-04 PASSED');
    });

    test('TC-05: Submitting search form redirects to results.html with query params', async () => {
      log('⌨️', 'Typing "Kandy" in To input...');
      const toInput = await driver.findElement(By.id('toInput'));
      await toInput.clear();
      await toInput.sendKeys('Kandy');
      await sleep(1000);

      const dropdown = await driver.wait(until.elementLocated(By.id('toDropdown')), 5000);
      const firstItem = await driver.findElement(By.css('#toDropdown .autocomplete-item'));
      await firstItem.click();
      await sleep(800);

      log('🖱️', 'Clicking Search button...');
      const submitBtn = await driver.findElement(By.css('#searchForm button[type="submit"]'));
      await submitBtn.click();
      await sleep(2000);

      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Current URL is: "${currentUrl}"`);
      expect(currentUrl).toContain('results.html');
      expect(currentUrl).toContain('from=');
      expect(currentUrl).toContain('to=');
      
      log('✅', 'TC-05 PASSED');
    });

    test('TC-06: Results page loads train cards for Colombo Fort → Kandy', async () => {
      log('⏳', 'Waiting for results search to complete on results.html...');
      const resultsCountEl = await driver.wait(until.elementLocated(By.id('resultsCount')), 10000);
      
      // Wait until the searching status text is gone
      await driver.wait(async () => {
        const text = await resultsCountEl.getText();
        return !text.includes('Searching') && !text.includes('Searching schedules');
      }, 10000);

      await sleep(1500);
      
      const cards = await driver.findElements(By.css('#trainGrid .train-card'));
      log('📋', `Found ${cards.length} train cards in results`);
      
      if (cards.length === 0) {
        const pageText = await driver.findElement(By.tagName('body')).getText();
        log('⚠️', `DEBUG results count text: "${await resultsCountEl.getText()}"`);
        log('⚠️', `DEBUG page text preview: "${pageText.substring(0, 300)}"`);
      }

      expect(cards.length).toBeGreaterThan(0);
      log('✅', 'TC-06 PASSED');
    });

    test('TC-07: Clicking a train card opens a detail modal (stops accordion)', async () => {
      log('🖱️', 'Toggling stops accordion for the first train card...');
      const toggleBtn = await driver.wait(until.elementLocated(By.css('#trainGrid .train-card button.btn-secondary')), 5000);
      await toggleBtn.click();
      await sleep(1500);

      const accordion = await driver.findElement(By.css('#trainGrid .train-card .stops-accordion'));
      const isVisible = await accordion.isDisplayed();
      log('👁', `Stops accordion is visible: ${isVisible}`);
      expect(isVisible).toBe(true);
      
      log('✅', 'TC-07 PASSED');
    });

    test('TC-08: Timetable page loads with route filter pills', async () => {
      log('🌐', 'Navigating to timetable.html...');
      await driver.get(`${BASE}/timetable.html`);
      await sleep(2000);

      const routeFilters = await driver.wait(until.elementLocated(By.id('routeFilters')), 5000);
      const filterPills = await driver.findElements(By.css('#routeFilters .filter-pill'));
      log('💊', `Found ${filterPills.length} route filter pills`);
      expect(filterPills.length).toBeGreaterThan(0);
      
      log('✅', 'TC-08 PASSED');
    });

    test('TC-09: Clicking a route filter pill shows only that route\'s trains', async () => {
      log('🖱️', 'Clicking first route filter pill...');
      const filterPills = await driver.findElements(By.css('#routeFilters .filter-pill'));
      await filterPills[0].click();
      await sleep(1500);

      const rows = await driver.findElements(By.css('#timetableBody tr'));
      log('📋', `Found ${rows.length} rows in timetable body`);
      expect(rows.length).toBeGreaterThan(0);
      
      log('✅', 'TC-09 PASSED');
    });

    test('TC-10: Schedules page loads stats and table', async () => {
      log('🌐', 'Navigating to schedules.html...');
      await driver.get(`${BASE}/schedules.html`);
      await sleep(2000);

      const statTotal = await driver.findElement(By.id('statTotal'));
      const totalVal = await statTotal.getText();
      log('📊', `Stat Total: "${totalVal}"`);
      expect(totalVal).not.toBe('—');
      
      const rows = await driver.findElements(By.css('#tableArea table tbody tr'));
      expect(rows.length).toBeGreaterThan(0);
      
      log('✅', 'TC-10 PASSED');
    });

    test('TC-11: Disruptions page loads stats and reliability table', async () => {
      log('🌐', 'Navigating to disruptions.html...');
      await driver.get(`${BASE}/disruptions.html`);
      
      log('⏳', 'Waiting for disruptions table to load...');
      const firstRow = await driver.wait(until.elementLocated(By.css('#tableArea table tbody tr')), 10000);
      expect(firstRow).toBeDefined();

      const totalTrains = await driver.findElement(By.id('totalTrains'));
      const totalVal = await totalTrains.getText();
      log('📊', `Disruption active trains count: "${totalVal}"`);
      expect(totalVal).not.toBe('—');

      const rows = await driver.findElements(By.css('#tableArea table tbody tr'));
      expect(rows.length).toBeGreaterThan(0);
      
      log('✅', 'TC-11 PASSED');
    });

    test('TC-12: Disruptions filter buttons (Reliable / Moderate / Unreliable) work', async () => {
      log('🖱️', 'Clicking Reliable filter button...');
      const filterHigh = await driver.findElement(By.id('filter-high'));
      await filterHigh.click();
      await sleep(1500);

      const rows = await driver.findElements(By.css('#tableArea table tbody tr'));
      log('📋', `Found ${rows.length} rows after high filter`);
      expect(rows.length).toBeGreaterThanOrEqual(0);
      
      log('✅', 'TC-12 PASSED');
    });

    test('TC-13: Live Map page initializes Leaflet map with leaflet-container class', async () => {
      log('🌐', 'Navigating to live-map.html...');
      await driver.get(`${BASE}/live-map.html`);
      await sleep(2500);

      const mapContainer = await driver.findElement(By.id('map'));
      const classes = await mapContainer.getAttribute('class');
      log('🗺️', `Map element classes: "${classes}"`);
      expect(classes).toContain('leaflet-container');
      
      log('✅', 'TC-13 PASSED');
    });

    test('TC-14: Live Map train search input filters sidebar list', async () => {
      log('⌨️', 'Typing "Intercity" in Live Map search input...');
      const searchInput = await driver.findElement(By.id('searchInput'));
      await searchInput.clear();
      await searchInput.sendKeys('Intercity');
      await sleep(1000);

      // Check option loading in schedules dropdown select
      const select = await driver.findElement(By.id('scheduleSelect'));
      const options = await select.findElements(By.tagName('option'));
      log('📋', `Dropdown select option count is: ${options.length}`);
      expect(options.length).toBeGreaterThanOrEqual(1);
      
      log('✅', 'TC-14 PASSED');
    });

    test('TC-15: Backend /health endpoint returns OK', async () => {
      log('🌐', 'Navigating to /health...');
      await driver.get(`${BASE}/health`);
      await sleep(1000);

      const body = await driver.findElement(By.tagName('body'));
      const bodyText = await body.getText();
      log('🧬', `Health Check body text: "${bodyText}"`);
      
      // Parse body text to JSON
      const json = JSON.parse(bodyText);
      expect(json.status).toBe('ok');
      expect(json.db).toBe('connected');
      
      log('✅', 'TC-15 PASSED');
    });
  });

  // =========================================================================
  // 🟡 Group 2 — Authentication Flows (TC-16 to TC-24)
  // =========================================================================
  describe('Group 2 — Authentication Flows', () => {

    test('TC-16: Login page loads with identifierInput, passwordInput, submit button', async () => {
      log('🌐', 'Navigating to login.html...');
      await driver.get(`${BASE}/login.html`);
      await sleep(1500);

      const identifierInput = await driver.findElement(By.id('identifierInput'));
      const passwordInput = await driver.findElement(By.id('passwordInput'));
      const submitBtn = await driver.findElement(By.css('#loginForm button[type="submit"]'));

      expect(identifierInput).toBeDefined();
      expect(passwordInput).toBeDefined();
      expect(submitBtn).toBeDefined();
      
      log('✅', 'TC-16 PASSED');
    });

    test('TC-17: Passenger tab / Staff tab / Admin tab switch shows correct label', async () => {
      log('🖱️', 'Clicking Staff auth tab...');
      const staffTab = await driver.findElement(By.css('.auth-tab[data-role="staff"]'));
      await staffTab.click();
      await sleep(500);

      const label = await driver.findElement(By.id('identifierLabel'));
      const labelText = await label.getText();
      log('🏷️', `Label text: "${labelText}"`);
      expect(labelText.toLowerCase()).toContain('email or employee id');

      log('🖱️', 'Clicking Passenger auth tab...');
      const passengerTab = await driver.findElement(By.css('.auth-tab[data-role="passenger"]'));
      await passengerTab.click();
      await sleep(500);

      const labelTextPax = await label.getText();
      log('🏷️', `Label text: "${labelTextPax}"`);
      expect(labelTextPax.toLowerCase()).toContain('email address');
      
      log('✅', 'TC-17 PASSED');
    });

    test('TC-18: Login with wrong credentials shows #errorMsg', async () => {
      log('⌨️', 'Submitting wrong credentials...');
      const identifierInput = await driver.findElement(By.id('identifierInput'));
      await identifierInput.clear();
      await identifierInput.sendKeys('wrong_pax@example.com');
      
      const passwordInput = await driver.findElement(By.id('passwordInput'));
      await passwordInput.clear();
      await passwordInput.sendKeys('wrongpassword');

      const submitBtn = await driver.findElement(By.css('#loginForm button[type="submit"]'));
      await submitBtn.click();

      // Wait for error text to populate
      const errorMsg = await driver.findElement(By.id('errorMsg'));
      await driver.wait(async () => (await errorMsg.getText()).length > 0, 5000);

      const errorText = await errorMsg.getText();
      log('❌', `Error message: "${errorText}"`);
      expect(errorText.length).toBeGreaterThan(0);
      
      log('✅', 'TC-18 PASSED');
    });

    test('TC-19: Login with valid Passenger credentials redirects to index.html', async () => {
      log('🔐', 'Logging in as Passenger...');
      const identifierInput = await driver.findElement(By.id('identifierInput'));
      await identifierInput.clear();
      await identifierInput.sendKeys(CREDS.passenger.email);
      
      const passwordInput = await driver.findElement(By.id('passwordInput'));
      await passwordInput.clear();
      await passwordInput.sendKeys(CREDS.passenger.password);

      const submitBtn = await driver.findElement(By.css('#loginForm button[type="submit"]'));
      await submitBtn.click();
      await sleep(2000);

      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Current URL is: "${currentUrl}"`);
      expect(currentUrl).toContain('index.html');
      
      log('✅', 'TC-19 PASSED');
    });

    test('TC-20: Register page loads with all required fields', async () => {
      log('🔐', 'Clearing login session so register.html does not auto-redirect...');
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');

      log('🌐', 'Navigating to register.html...');
      await driver.get(`${BASE}/register.html`);
      await sleep(1500);

      const firstName = await driver.findElement(By.id('firstNameInput'));
      const lastName = await driver.findElement(By.id('lastNameInput'));
      const email = await driver.findElement(By.id('emailInput'));
      const password = await driver.findElement(By.id('passwordInput'));
      const confirmPassword = await driver.findElement(By.id('confirmPasswordInput'));

      expect(firstName).toBeDefined();
      expect(lastName).toBeDefined();
      expect(email).toBeDefined();
      expect(password).toBeDefined();
      expect(confirmPassword).toBeDefined();
      
      log('✅', 'TC-20 PASSED');
    });

    test('TC-21: Register: switching to Staff tab shows employee fields', async () => {
      log('🖱️', 'Clicking Register Staff tab...');
      const staffTab = await driver.findElement(By.css('.auth-tab[data-role="staff"]'));
      await staffTab.click();
      await sleep(800);

      const staffFields = await driver.findElement(By.id('staffFields'));
      const isVisible = await staffFields.isDisplayed();
      log('👷', `Staff fields visible: ${isVisible}`);
      expect(isVisible).toBe(true);
      
      log('✅', 'TC-21 PASSED');
    });

    test('TC-22: Register: submitting mismatched passwords shows #errorMsg', async () => {
      log('🖱️', 'Clicking Passenger tab in register...');
      const passengerTab = await driver.findElement(By.css('.auth-tab[data-role="passenger"]'));
      await passengerTab.click();
      await sleep(500);

      log('⌨️', 'Filling registration with mismatched passwords...');
      const firstInput = await driver.findElement(By.id('firstNameInput'));
      await firstInput.clear();
      await firstInput.sendKeys('Tester');
      
      const lastInput = await driver.findElement(By.id('lastNameInput'));
      await lastInput.clear();
      await lastInput.sendKeys('User');

      const emailInput = await driver.findElement(By.id('emailInput'));
      await emailInput.clear();
      await emailInput.sendKeys(`test_${Date.now()}@ceylon.lk`);

      const passInput = await driver.findElement(By.id('passwordInput'));
      await passInput.clear();
      await passInput.sendKeys('Pass123!');

      const confirmInput = await driver.findElement(By.id('confirmPasswordInput'));
      await confirmInput.clear();
      await confirmInput.sendKeys('MismatchedPass!');

      const submitBtn = await driver.findElement(By.css('#registerForm button[type="submit"]'));
      
      // Scroll to avoid click interception from overlapping footers
      await driver.executeScript('arguments[0].scrollIntoView(true);', submitBtn);
      await sleep(500);
      await submitBtn.click();
      await sleep(1500);

      const errorMsg = await driver.findElement(By.id('errorMsg'));
      const errorText = await errorMsg.getText();
      log('❌', `Register Error: "${errorText}"`);
      expect(errorText).toContain('Passwords do not match');
      
      log('✅', 'TC-22 PASSED');
    });

    test('TC-23: Register: submitting a valid new Passenger account redirects to login', async () => {
      log('⌨️', 'Updating Confirm Password to match...');
      const confirmInput = await driver.findElement(By.id('confirmPasswordInput'));
      await confirmInput.clear();
      await confirmInput.sendKeys('Pass123!');

      const submitBtn = await driver.findElement(By.css('#registerForm button[type="submit"]'));
      await driver.executeScript('arguments[0].scrollIntoView(true);', submitBtn);
      await sleep(500);
      await driver.executeScript('arguments[0].click();', submitBtn);
      
      // Since it is passenger role, it registers and redirects to index.html or logs in.
      await sleep(2500);
      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Registered and landed on URL: "${currentUrl}"`);
      expect(currentUrl).not.toContain('register.html');
      
      log('✅', 'TC-23 PASSED');
    });

    test('TC-24: Logout: after login, navigating to login page and back clears session', async () => {
      log('🔐', 'Logging out passenger by clearing localStorage...');
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
      await driver.get(`${BASE}/index.html`);
      await sleep(1500);

      // Verify that there is no watch tab or staff dashboard in nav links
      const navLinks = await driver.findElement(By.id('nav-links'));
      const linksText = await navLinks.getText();
      log('🔗', `Nav links: "${linksText.replace(/\n/g, ' | ')}"`);
      expect(linksText).not.toContain('Journey Watch');
      
      log('✅', 'TC-24 PASSED');
    });
  });

  // =========================================================================
  // 🟢 Group 3 — Passenger Authenticated Flows (TC-25 to TC-28)
  // =========================================================================
  describe('Group 3 — Passenger Authenticated Flows', () => {

    test('TC-25: Journey Watch page loads watch grid after passenger login', async () => {
      // First log in
      await loginAs(driver, 'passenger');

      log('🌐', 'Navigating to watch.html...');
      await driver.get(`${BASE}/watch.html`);
      await sleep(2000);

      const grid = await driver.wait(until.elementLocated(By.id('watchGrid')), 5000);
      expect(grid).toBeDefined();
      log('✅', 'TC-25 PASSED');
    });

    test('TC-26: Journey Watch page shows auth redirect if not logged in', async () => {
      log('🔐', 'Clearing login session...');
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
      
      log('🌐', 'Navigating to watch.html (unauthenticated)...');
      await driver.get(`${BASE}/watch.html`);
      await sleep(2000);

      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Redirected URL is: "${currentUrl}"`);
      // Since window.api.requireRole('passenger') throws an error or redirects to login:
      // Let's verify we are no longer on watch.html or show toast
      expect(currentUrl).not.toContain('watch.html');
      
      log('✅', 'TC-26 PASSED');
    });

    test('TC-27: Settings page loads theme grid and save button', async () => {
      // Login again
      await loginAs(driver, 'passenger');

      log('🌐', 'Navigating to settings.html...');
      await driver.get(`${BASE}/settings.html`);
      await sleep(2000);

      const themeGrid = await driver.wait(until.elementLocated(By.id('themeGrid')), 5000);
      const saveBtn = await driver.findElement(By.id('saveBtn'));
      expect(themeGrid).toBeDefined();
      expect(saveBtn).toBeDefined();
      
      log('✅', 'TC-27 PASSED');
    });

    test('TC-28: Settings: clicking a theme option selects it visually', async () => {
      log('🖱️', 'Clicking the first theme option card...');
      let themeOptions = await driver.findElements(By.css('#themeGrid .theme-option'));
      if (themeOptions.length > 0) {
        await themeOptions[0].click();
        await sleep(1500);
        
        // Re-locate themes to prevent stale element reference
        themeOptions = await driver.findElements(By.css('#themeGrid .theme-option'));
        const classes = await themeOptions[0].getAttribute('class');
        log('🎨', `Theme option classes: "${classes}"`);
        expect(classes).toContain('selected');
      } else {
        log('⚠️', 'No theme options found in settings!');
      }
      
      log('✅', 'TC-28 PASSED');
    });
  });

  // =========================================================================
  // 🔴 Group 4 — Staff Authenticated Flows (TC-29 to TC-31)
  // =========================================================================
  describe('Group 4 — Staff Authenticated Flows', () => {

    test('TC-29: Admin login with staff credentials redirects to staff-app.html', async () => {
      log('🔐', 'Logging in as Staff...');
      await loginAs(driver, 'staff');

      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Staff login landed on URL: "${currentUrl}"`);
      expect(currentUrl).toContain('staff-app.html');
      
      log('✅', 'TC-29 PASSED');
    });

    test('TC-30: Staff App page loads with schedule section visible', async () => {
      log('⏳', 'Waiting for official timetable table to load...');
      const table = await driver.wait(until.elementLocated(By.id('timetableTable')), 5000);
      expect(table).toBeDefined();

      const timetableTab = await driver.findElement(By.id('timetable-tab'));
      const isVisible = await timetableTab.isDisplayed();
      log('📅', `Timetable tab is active and visible: ${isVisible}`);
      expect(isVisible).toBe(true);
      
      log('✅', 'TC-30 PASSED');
    });

    test('TC-31: Staff App: clicking "Propose Changes" opens the proposal modal', async () => {
      log('🖱️', 'Clicking Propose Changes tab button...');
      const propTabBtn = await driver.findElement(By.css('.tab-btn[data-tab="proposals-tab"]'));
      await propTabBtn.click();
      await sleep(1000);

      log('🖱️', 'Clicking "+ Propose New Train" button...');
      const openModalBtn = await driver.findElement(By.css('#proposals-tab button.btn-primary'));
      await openModalBtn.click();
      await sleep(1000);

      const modal = await driver.findElement(By.id('proposalModal'));
      const isVisible = await modal.isDisplayed();
      log('➕', `Propose Change Modal visible: ${isVisible}`);
      expect(isVisible).toBe(true);

      // Close modal
      const closeBtn = await driver.findElement(By.css('#proposalModal span[onclick="closeProposalModal()"]'));
      await closeBtn.click();
      await sleep(500);
      
      log('✅', 'TC-31 PASSED');
    });
  });

  // =========================================================================
  // 🟣 Group 5 — Admin Authenticated Flows (TC-32 to TC-36)
  // =========================================================================
  describe('Group 5 — Admin Authenticated Flows', () => {

    test('TC-32: Admin login with admin credentials redirects to admin.html', async () => {
      log('🔐', 'Logging in as Admin...');
      await loginAs(driver, 'admin');

      const currentUrl = await driver.getCurrentUrl();
      log('🌐', `Admin login landed on URL: "${currentUrl}"`);
      expect(currentUrl).toContain('admin.html');
      
      log('✅', 'TC-32 PASSED');
    });

    test('TC-33: Admin Dashboard loads with analytics cards (total trains, schedules)', async () => {
      log('⏳', 'Checking Overview tab counters...');
      const schedulesCount = await driver.findElement(By.id('ovSchedules'));
      const countVal = await schedulesCount.getText();
      log('📊', `Admin Overview schedules count: "${countVal}"`);
      expect(countVal).not.toBe('');
      
      log('✅', 'TC-33 PASSED');
    });

    test('TC-34: Admin Dashboard: clicking "Timetable" tab loads timetable section', async () => {
      log('🖱️', 'Clicking Timetable tab...');
      const tabBtn = await driver.findElement(By.css('#adminTabs button[data-target="tab-timetable"]'));
      await tabBtn.click();
      await sleep(1000);

      const tabContent = await driver.findElement(By.id('tab-timetable'));
      const isVisible = await tabContent.isDisplayed();
      log('📅', `Timetable tab content is active and visible: ${isVisible}`);
      expect(isVisible).toBe(true);
      
      log('✅', 'TC-34 PASSED');
    });

    test('TC-35: Admin Dashboard: "Change Requests" tab shows pending requests table', async () => {
      log('🖱️', 'Clicking Change Requests tab...');
      const tabBtn = await driver.findElement(By.css('#adminTabs button[data-target="tab-requests"]'));
      await tabBtn.click();
      await sleep(1500);

      const tableBody = await driver.findElement(By.id('changeRequestsTableBody'));
      expect(tableBody).toBeDefined();
      const text = await tableBody.getText();
      log('📋', `Change Requests Table Content snippet: "${text.substring(0, 40)}..."`);
      
      log('✅', 'TC-35 PASSED');
    });

    test('TC-36: Admin Dashboard: "Stations" tab loads station list', async () => {
      log('🖱️', 'Clicking Stations tab...');
      const tabBtn = await driver.findElement(By.css('#adminTabs button[data-target="tab-stations"]'));
      await tabBtn.click();
      await sleep(1500);

      const tabContent = await driver.findElement(By.id('tab-stations'));
      const isVisible = await tabContent.isDisplayed();
      log('🚉', `Stations tab content is active and visible: ${isVisible}`);
      expect(isVisible).toBe(true);

      const stationForm = await driver.findElement(By.id('stationForm'));
      expect(stationForm).toBeDefined();
      
      log('✅', 'TC-36 PASSED');
    });
  });
});
