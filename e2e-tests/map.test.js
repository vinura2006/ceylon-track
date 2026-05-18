const { By, until } = require('selenium-webdriver');
const { createDriver } = require('./driverSetup');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

describe('Live Map Flow', () => {
    let driver;
    const frontendPath = path.resolve(__dirname, '../frontend');
    const mapUrl = process.env.FRONTEND_URL 
        ? `${process.env.FRONTEND_URL}/map.html` 
        : `file://${frontendPath}/map.html`;

    beforeAll(async () => {
        driver = await createDriver();
    });

    afterAll(async () => {
        if (driver) {
            await driver.quit();
        }
    });

    test('should load the map page and render the map container', async () => {
        console.log('\n  🌐 [STEP] Navigating to map.html...');
        await driver.get(mapUrl);
        await sleep(2000); // Pause so you can see the map loading
        
        console.log('  ⏳ [STEP] Waiting for #map element...');
        const mapContainer = await driver.wait(until.elementLocated(By.id('map')), 5000);
        
        console.log('  ⏳ [STEP] Waiting for Leaflet to attach leaflet-container class...');
        await driver.wait(async () => {
            const classAttr = await mapContainer.getAttribute('class');
            return classAttr.includes('leaflet-container');
        }, 5000, 'Map container did not initialize Leaflet');
        await sleep(2000); // Pause so you can see the loaded map with tracks
        
        const title = await driver.getTitle();
        console.log(`  📄 [CHECK] Page title is: "${title}"`);
        expect(title).toContain('Ceylon Track');
        console.log('  ✅ [PASS] Leaflet map initialized successfully.');
    });

    test('should fetch and list active trains in the sidebar', async () => {
        console.log('\n  🌐 [STEP] Navigating to map.html...');
        await driver.get(mapUrl);
        await sleep(2000);
        
        console.log('  ⏳ [STEP] Waiting for #trainList element...');
        const trainList = await driver.wait(until.elementLocated(By.id('trainList')), 5000);
        
        console.log('  ⏳ [STEP] Waiting for train cards to populate (up to 8s)...');
        await driver.wait(async () => {
            const children = await trainList.findElements(By.css('div'));
            return children.length > 0;
        }, 8000, 'Train list did not populate');
        await sleep(2000); // Pause so you can see the train list

        const text = await trainList.getText();
        console.log(`  🚆 [CHECK] Train list content preview: "${text.substring(0, 80)}..."`);
        expect(text).toBeDefined();
        console.log('  ✅ [PASS] Train list populated successfully.');
    });
});
