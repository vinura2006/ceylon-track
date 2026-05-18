const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runTest() {
    const reportPath = path.join(__dirname, '../docs/E2E_Test_Report.txt');
    const mapProofPath = path.join(__dirname, '../docs/e2e_map_proof.png');
    const errorProofPath = path.join(__dirname, '../docs/e2e_error.png');
    
    // Ensure docs directory exists
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    let browser;
    try {
        console.log('STEP 1: Launching browser...');
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 50,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        const baseUrl = 'http://localhost:3000';

        console.log('STEP 2: Navigating to index.html and verifying station list...');
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle2' });
        // Wait for the station search autocomplete wrapper to appear
        await page.waitForSelector('#fromStation', { timeout: 10000 });

        console.log('STEP 3: Navigating to login.html and logging in...');
        await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#email', { timeout: 5000 });
        await page.type('#email', 'passenger@example.com'); // Known seeded user from credentials list
        await page.type('#password', 'password123');
        
        console.log('STEP 4: Waiting for redirect to confirm login...');
        await Promise.all([
            page.click('#loginBtn'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        ]);
        
        const currentUrl = page.url();
        if (currentUrl.includes('login.html')) {
            throw new Error('Login failed. Still on login page.');
        }

        console.log('STEP 5: Searching for a journey...');
        // The search form is on index.html, which redirects to results.html. 
        // We navigate to index.html to perform the type/select action.
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#fromStation', { timeout: 5000 });
        
        // Type into the station inputs
        await page.type('#fromStation', 'Colombo Fort');
        // Select the first autocomplete option if it exists
        try {
            await page.waitForSelector('#fromDropdown .autocomplete-item', { timeout: 2000 });
            await page.click('#fromDropdown .autocomplete-item');
        } catch(e) {
            // Ignore if no autocomplete dropdown appears
        }

        await page.type('#toStation', 'Kandy');
        try {
            await page.waitForSelector('#toDropdown .autocomplete-item', { timeout: 2000 });
            await page.click('#toDropdown .autocomplete-item');
        } catch(e) {
            // Ignore if no autocomplete dropdown appears
        }

        // Search action
        await Promise.all([
            page.click('#searchBtn'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        ]);
        
        if (!page.url().includes('results.html')) {
            throw new Error('Search failed to redirect to results.html');
        }

        // Verify train cards appear
        await page.waitForSelector('.train-card', { timeout: 10000 });

        console.log('STEP 6: Navigating to disruptions.html...');
        await page.goto(`${baseUrl}/disruptions.html`, { waitUntil: 'networkidle2' });
        // Assuming table exists
        await page.waitForSelector('table', { timeout: 10000 });

        console.log('STEP 7: Navigating to map.html...');
        await page.goto(`${baseUrl}/map.html`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#map', { timeout: 10000 });
        // Wait briefly for map tiles and markers to render
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('STEP 8: Taking screenshot of the map page...');
        await page.screenshot({ path: mapProofPath, fullPage: true });

        console.log('STEP 9: Closing browser...');
        await browser.close();
        
        fs.writeFileSync(reportPath, 'STATUS: PASS - All UI components functional.\n');
        console.log('Test completed successfully. Report generated at docs/E2E_Test_Report.txt');
        
    } catch (error) {
        console.error('ERROR during test execution:', error.message);
        if (browser) {
            try {
                const pages = await browser.pages();
                const activePage = pages[pages.length - 1];
                if (activePage) {
                    await activePage.screenshot({ path: errorProofPath, fullPage: true });
                    console.log(`Error screenshot saved to ${errorProofPath}`);
                }
            } catch (screenshotError) {
                console.error('Failed to take error screenshot:', screenshotError);
            }
            await browser.close();
        }
        
        fs.writeFileSync(reportPath, `STATUS: FAIL\nERROR DETAILS: ${error.message}\nSTEP FAILED: The script encountered an error during execution.\n`);
        console.log('Test failed. Report generated at docs/E2E_Test_Report.txt');
        process.exit(1);
    }
}

runTest();
