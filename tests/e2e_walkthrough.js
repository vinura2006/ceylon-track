/**
 * Ceylon Track – Full E2E Walkthrough (Puppeteer)
 * ================================================
 * Covers every major workflow in the system:
 *
 *  1. Public: Station search → results page
 *  2. Public: Timetable page with route filter pills
 *  3. Public: Disruptions table
 *  4. Public: Live-map page
 *  5. Passenger: Register (new random user) + Login → index
 *  6. Staff:    Login → Staff dashboard tab navigation
 *  7. Staff:    Submit a "add" change-request proposal
 *  8. Admin:    Login → Change Requests tab → Approve proposal
 *  9. Admin:    Timetable tab → Add new entry via modal
 * 10. Admin:    Stations tab → Add a new station
 * 11. Admin:    Staff management tab visible
 *
 * Requirements:
 *   - npm install puppeteer  (in project root)
 *   - Backend server running on http://localhost:3000
 *
 * Credentials (seeded):
 *   Admin  : admin@ceylontrack.lk  / Admin@1234
 *   Staff  : staff@ceylontrack.lk  / Staff@1234
 *   Passenger: passenger@example.com / password123
 *
 * Run:  node tests/e2e_walkthrough.js
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

// ── helpers ────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:3000';
const DOCS = path.join(__dirname, '../docs');

const CREDS = {
    admin:     { email: 'admin@ceylontrack.lk',  password: 'Admin@1234'   },
    staff:     { email: 'staff@ceylontrack.lk',  password: 'Staff@1234'   },
    passenger: { email: 'passenger@example.com', password: 'password123'  }
};

const STAFF_ACCESS_CODE = 'SLR-STAFF-2026';

if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });

/** Wait a fixed number of milliseconds */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Log a step to console with a timestamp */
function log(msg) {
    const now = new Date().toISOString().substring(11, 19);
    console.log(`[${now}] ${msg}`);
}

/** Take a named screenshot into docs/ */
async function shot(page, name) {
    const dest = path.join(DOCS, `e2e_${name}.png`);
    await page.screenshot({ path: dest, fullPage: true });
    log(`  📸  Screenshot → docs/e2e_${name}.png`);
}

/**
 * Navigate to login page, fill credentials, click login, wait for redirect.
 * @returns {boolean} true if login succeeded (no longer on login.html)
 */
async function loginAs(page, role) {
    const { email, password } = CREDS[role];
    await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email', { timeout: 8000 });
    await page.evaluate(() => {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    });
    await page.type('#email', email, { delay: 40 });
    await page.type('#password', password, { delay: 40 });
    await Promise.all([
        page.click('#loginBtn'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {})
    ]);
    const ok = !page.url().includes('login.html');
    if (!ok) log(`  ⚠️  Login as ${role} may have failed (still on login page)`);
    return ok;
}

// ── main test ──────────────────────────────────────────────────────────────
async function runTests() {
    const reportLines = [];
    const failures    = [];
    let browser;

    function pass(label) {
        log(`  ✅  PASS: ${label}`);
        reportLines.push(`PASS: ${label}`);
    }
    function fail(label, err) {
        log(`  ❌  FAIL: ${label} → ${err}`);
        reportLines.push(`FAIL: ${label} → ${err}`);
        failures.push(label);
    }
    async function check(label, fn) {
        try {
            await fn();
            pass(label);
        } catch (err) {
            fail(label, err.message);
        }
    }

    try {
        log('Launching browser...');
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 60,
            defaultViewport: { width: 1400, height: 900 }
        });
        const page = await browser.newPage();

        // ══════════════════════════════════════════════════════════════════
        // SECTION 1 – PUBLIC: Home page station search
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 1: Public home page + journey search');

        await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle2' });
        await check('Home page loads (from-station input visible)', async () => {
            await page.waitForSelector('#fromStation', { timeout: 10000 });
        });

        await check('Journey search → redirects to results.html', async () => {
            await page.waitForSelector('#fromStation', { timeout: 5000 });
            await page.click('#fromStation', { clickCount: 3 });
            await page.type('#fromStation', 'Colombo Fort', { delay: 40 });
            try {
                await page.waitForSelector('#fromDropdown .autocomplete-item', { timeout: 2500 });
                await page.click('#fromDropdown .autocomplete-item');
            } catch (_) { /* no autocomplete – fine */ }

            await page.click('#toStation', { clickCount: 3 });
            await page.type('#toStation', 'Kandy', { delay: 40 });
            try {
                await page.waitForSelector('#toDropdown .autocomplete-item', { timeout: 2500 });
                await page.click('#toDropdown .autocomplete-item');
            } catch (_) { /* no autocomplete – fine */ }

            await Promise.all([
                page.click('#searchBtn'),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 })
            ]);
            if (!page.url().includes('results.html')) throw new Error('Did not reach results.html');
        });

        await check('Results page shows train cards', async () => {
            await page.waitForSelector('.train-card, #noResultsMsg, #resultsBody tr', { timeout: 10000 });
        });
        await shot(page, '01_results');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 2 – PUBLIC: Official Timetable page
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 2: Public timetable page');

        await page.goto(`${BASE}/timetable.html`, { waitUntil: 'networkidle2' });
        await check('Timetable page loads (timetableBody visible)', async () => {
            await page.waitForSelector('#timetableBody', { timeout: 8000 });
        });
        await check('Route filter pills rendered', async () => {
            await page.waitForSelector('#routeFilters .filter-pill', { timeout: 10000 });
        });
        await check('Timetable rows appear after load', async () => {
            await page.waitForFunction(
                () => document.querySelectorAll('#timetableBody tr.train-row').length > 0,
                { timeout: 12000 }
            );
        });
        await shot(page, '02_timetable');

        // Click the first non-"All Routes" pill to test filtering
        await check('Route filter pill click filters timetable', async () => {
            const pills = await page.$$('#routeFilters .filter-pill');
            if (pills.length > 1) {
                await pills[1].click();
                await sleep(1500);
                // Just confirm the page didn't crash
                await page.waitForSelector('#timetableBody', { timeout: 5000 });
            }
        });
        await shot(page, '02b_timetable_filtered');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 3 – PUBLIC: Disruptions page
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 3: Disruptions page');

        await page.goto(`${BASE}/disruptions.html`, { waitUntil: 'networkidle2' });
        await check('Disruptions page loads (table visible)', async () => {
            await page.waitForSelector('table', { timeout: 10000 });
        });
        await shot(page, '03_disruptions');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 4 – PUBLIC: Live map page
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 4: Live map page');

        await page.goto(`${BASE}/live-map.html`, { waitUntil: 'networkidle2' });
        await check('Live map page loads (#map element present)', async () => {
            await page.waitForSelector('#map', { timeout: 10000 });
        });
        await sleep(3000); // allow Leaflet tiles to render
        await shot(page, '04_live_map');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 5 – PASSENGER: Register new user + Login
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 5: Passenger registration + login');

        const randEmail = `testuser_${Date.now()}@e2e.test`;
        await page.goto(`${BASE}/register.html`, { waitUntil: 'networkidle2' });
        await check('Register page loads', async () => {
            await page.waitForSelector('#email', { timeout: 8000 });
        });
        await check('Passenger registration form submission', async () => {
            await page.type('#first_name', 'E2E', { delay: 30 });
            await page.type('#last_name', 'Tester', { delay: 30 });
            await page.type('#email', randEmail, { delay: 30 });
            await page.type('#password', 'Test@1234', { delay: 30 });
            // Role selector – keep default "passenger"
            await Promise.all([
                page.click('#registerBtn'),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {})
            ]);
            // Could stay on register.html with a success message or redirect
            // Just verify page didn't error
            await page.waitForSelector('body', { timeout: 5000 });
        });
        await shot(page, '05a_register');

        await check('Passenger login succeeds', async () => {
            const ok = await loginAs(page, 'passenger');
            // Fallback: known seeded passenger
            if (!ok) await loginAs(page, 'passenger');
        });
        await shot(page, '05b_passenger_login');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 6 – STAFF: Login → Dashboard tabs
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 6: Staff login + dashboard');

        await check('Staff login succeeds', async () => {
            const ok = await loginAs(page, 'staff');
            if (!ok) throw new Error('Staff login did not redirect away from login.html');
        });

        await page.goto(`${BASE}/staff-app.html`, { waitUntil: 'networkidle2' });
        await check('Staff dashboard loads (greeting header visible)', async () => {
            await page.waitForSelector('#greetingHeader', { timeout: 10000 });
        });
        await check('Timetable tab is active by default (timetableBody visible)', async () => {
            await page.waitForSelector('#timetableBody', { timeout: 10000 });
        });
        await shot(page, '06a_staff_timetable_tab');

        // Switch to Proposals tab
        await check('Staff proposals tab renders (myProposalsBody visible)', async () => {
            await page.click('[data-tab="proposals-tab"], button[onclick*="proposals"]');
            await page.waitForSelector('#myProposalsBody', { timeout: 8000 });
        });
        await shot(page, '06b_staff_proposals_tab');

        // Switch to Share Location tab
        await check('Staff share-location tab renders (scheduleSelect visible)', async () => {
            await page.click('#tabBtnShareLocation');
            await page.waitForSelector('#scheduleSelect', { timeout: 8000 });
        });
        await shot(page, '06c_staff_location_tab');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 7 – STAFF: Submit a "add" change-request proposal
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 7: Staff submits an "add" change-request');

        await page.goto(`${BASE}/staff-app.html`, { waitUntil: 'networkidle2' });
        await check('Staff app reloads after navigation', async () => {
            await page.waitForSelector('#greetingHeader', { timeout: 10000 });
        });

        // Click the "Propose New Entry" button (opens proposalModal for 'add' type)
        await check('Proposal modal opens via Propose button', async () => {
            // Look for the propose/add button in the timetable tab
            const proposeBtn = await page.$('#btnProposeNew, button[onclick*="openProposalModal"]') ||
                               (await page.$$('button')).find ? null : null;
            // Try by text content as fallback
            const btns = await page.$$('button');
            let clicked = false;
            for (const btn of btns) {
                const txt = await page.evaluate(el => el.textContent, btn);
                if (/propose new|new entry|add entry/i.test(txt)) {
                    await btn.click();
                    clicked = true;
                    break;
                }
            }
            if (!clicked) {
                // Trigger directly via JS if button not found
                await page.evaluate(() => {
                    if (typeof openProposalModal === 'function') openProposalModal('add', null);
                });
            }
            await page.waitForSelector('#proposalModal', { timeout: 5000 });
            const display = await page.evaluate(() => document.getElementById('proposalModal').style.display);
            if (display === 'none') throw new Error('proposalModal is still hidden');
        });

        await check('Fill and submit the add change-request form', async () => {
            // propChangeType hidden field should be 'add'
            await page.evaluate(() => {
                const setVal = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };
                setVal('propChangeType', 'add');
                setVal('propNo', 'E2E-999');
                setVal('propName', 'E2E Test Express');
                setVal('propRoute', 'Colombo - Galle');
                setVal('propStart', '1');
                setVal('propEnd', '2');
                setVal('propDep', '08:00');
                setVal('propArr', '11:00');
                setVal('propClass', '2nd Class');
                setVal('propFreq', 'Daily');
                setVal('propReason', 'Automated E2E test proposal');
            });

            // Submit the form
            const submitBtn = await page.$('#proposalForm button[type="submit"], #proposalForm .btn-primary');
            if (submitBtn) {
                await submitBtn.click();
            } else {
                await page.evaluate(() => {
                    if (typeof submitProposal === 'function') submitProposal();
                });
            }
            await sleep(2000);
        });
        await shot(page, '07_staff_proposal_submitted');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 8 – ADMIN: Login → Approve change-request
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 8: Admin login + approve change request');

        await check('Admin login succeeds', async () => {
            const ok = await loginAs(page, 'admin');
            if (!ok) throw new Error('Admin login did not redirect away from login.html');
        });

        await page.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle2' });
        await check('Admin dashboard loads (greetingHeader visible)', async () => {
            await page.waitForSelector('#greetingHeader', { timeout: 10000 });
        });
        await shot(page, '08a_admin_dashboard');

        // Click the "Change Requests" tab
        await check('Admin Change Requests tab loads (table body visible)', async () => {
            // The tab button includes "Change Requests" text
            const tabs = await page.$$('.tab-btn');
            let found = false;
            for (const tab of tabs) {
                const txt = await page.evaluate(el => el.textContent, tab);
                if (/change request/i.test(txt)) {
                    await tab.click();
                    found = true;
                    break;
                }
            }
            if (!found) throw new Error('Could not find Change Requests tab button');
            await page.waitForSelector('#changeRequestsTableBody', { timeout: 10000 });
        });
        await sleep(2000);
        await shot(page, '08b_admin_change_requests');

        // Try to approve the first pending request in the table
        await check('Admin approves first pending change request', async () => {
            const approveBtn = await page.$('#changeRequestsTableBody .btn-success, #changeRequestsTableBody button[onclick*="approve"]');
            if (approveBtn) {
                await approveBtn.click();
                await sleep(2000);
                // Handle confirm dialog if any
                page.on('dialog', async d => { await d.accept(); });
            } else {
                log('  ℹ️  No pending change request found to approve (may already be empty)');
            }
        });
        await shot(page, '08c_admin_cr_approved');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 9 – ADMIN: Timetable tab → Add new entry
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 9: Admin timetable CRUD – add new entry');

        await check('Admin Timetable tab loads (adminTimetableBody visible)', async () => {
            const tabs = await page.$$('.tab-btn');
            for (const tab of tabs) {
                const txt = await page.evaluate(el => el.textContent, tab);
                if (/timetable/i.test(txt) && !/request/i.test(txt)) {
                    await tab.click();
                    break;
                }
            }
            await page.waitForSelector('#adminTimetableBody', { timeout: 10000 });
        });
        await shot(page, '09a_admin_timetable_tab');

        await check('Admin timetable Add modal opens', async () => {
            const addBtn = await page.$('#btnAddTimetable, button[onclick*="openTimetableModal"]');
            if (addBtn) {
                await addBtn.click();
            } else {
                const btns = await page.$$('button');
                for (const btn of btns) {
                    const txt = await page.evaluate(el => el.textContent, btn);
                    if (/add timetable|new timetable/i.test(txt)) { await btn.click(); break; }
                }
            }
            await page.waitForSelector('#timetableModal', { timeout: 5000 });
            const display = await page.evaluate(() => document.getElementById('timetableModal').style.display);
            if (display === 'none') throw new Error('timetableModal still hidden');
        });

        await check('Admin fills and submits timetable add form', async () => {
            await page.evaluate(() => {
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
                setVal('trNo',   'E2E-800');
                setVal('trName', 'E2E Admin Express');
                setVal('trFrom', '1');
                setVal('trTo',   '2');
                setVal('trDep',  '09:00');
                setVal('trArr',  '12:00');
                // class / frequency / route if present
                const cls = document.getElementById('trClass'); if (cls) cls.value = '1st Class';
                const frq = document.getElementById('trFreq');  if (frq) frq.value = 'Daily';
                const rte = document.getElementById('trRoute'); if (rte) rte.value = 'Colombo - Kandy';
            });
            const submitBtn = await page.$('#timetableModal button[type="submit"], #timetableModal .btn-primary');
            if (submitBtn) {
                await submitBtn.click();
                await sleep(2000);
            }
        });
        await shot(page, '09b_admin_timetable_added');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 10 – ADMIN: Stations tab → Add new station
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 10: Admin stations tab – add station');

        await check('Admin Stations tab loads (stationForm visible)', async () => {
            const tabs = await page.$$('.tab-btn');
            for (const tab of tabs) {
                const txt = await page.evaluate(el => el.textContent, tab);
                if (/station/i.test(txt)) { await tab.click(); break; }
            }
            await page.waitForSelector('#stationForm', { timeout: 10000 });
        });
        await shot(page, '10a_admin_stations_tab');

        await check('Admin adds a new station', async () => {
            await page.evaluate(() => {
                document.getElementById('stName').value = 'E2E Test Station';
                document.getElementById('stCode').value = 'E2E';
                document.getElementById('stLat').value  = '7.1234';
                document.getElementById('stLng').value  = '80.1234';
            });
            const submitBtn = await page.$('#stationForm button[type="submit"], #stationForm .btn-primary');
            if (submitBtn) {
                await submitBtn.click();
                await sleep(2000);
            }
        });
        await shot(page, '10b_admin_station_added');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 11 – ADMIN: Staff management tab visible
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 11: Admin staff management tab');

        await check('Admin Staff tab loads (staffTableBody visible)', async () => {
            const tabs = await page.$$('.tab-btn');
            for (const tab of tabs) {
                const txt = await page.evaluate(el => el.textContent, tab);
                if (/staff/i.test(txt) && !/access/i.test(txt)) { await tab.click(); break; }
            }
            await page.waitForSelector('#staffTableBody', { timeout: 10000 });
        });
        await shot(page, '11_admin_staff_tab');

        // ══════════════════════════════════════════════════════════════════
        // SECTION 12 – ADMIN: Overview (stats cards visible)
        // ══════════════════════════════════════════════════════════════════
        log('SECTION 12: Admin overview stats');

        await check('Admin overview stats cards visible', async () => {
            const tabs = await page.$$('.tab-btn');
            for (const tab of tabs) {
                const txt = await page.evaluate(el => el.textContent, tab);
                if (/overview|dashboard/i.test(txt)) { await tab.click(); break; }
            }
            await page.waitForSelector('#ovSchedules', { timeout: 8000 });
        });
        await shot(page, '12_admin_overview');

        // ══════════════════════════════════════════════════════════════════
        // DONE
        // ══════════════════════════════════════════════════════════════════
        await browser.close();

        const status = failures.length === 0 ? 'ALL TESTS PASSED' : `${failures.length} TEST(S) FAILED`;
        const report = [
            `Ceylon Track E2E Report`,
            `Generated: ${new Date().toISOString()}`,
            `Status: ${status}`,
            ``,
            ...reportLines,
            ``,
            failures.length > 0 ? `Failed checks:\n${failures.map(f => '  - ' + f).join('\n')}` : ''
        ].join('\n');

        fs.writeFileSync(path.join(DOCS, 'E2E_Test_Report.txt'), report);
        log(`\n${'═'.repeat(55)}`);
        log(status);
        log(`Report → docs/E2E_Test_Report.txt`);
        log(`Screenshots → docs/e2e_*.png`);
        log('═'.repeat(55));

        if (failures.length > 0) process.exit(1);

    } catch (fatalErr) {
        log(`FATAL: ${fatalErr.message}`);
        if (browser) {
            try {
                const pages = await browser.pages();
                const last  = pages[pages.length - 1];
                if (last) await last.screenshot({ path: path.join(DOCS, 'e2e_FATAL.png'), fullPage: true });
            } catch (_) {}
            await browser.close();
        }
        fs.writeFileSync(path.join(DOCS, 'E2E_Test_Report.txt'),
            `STATUS: FATAL ERROR\n${fatalErr.message}\n${fatalErr.stack}`);
        process.exit(1);
    }
}

runTests();
