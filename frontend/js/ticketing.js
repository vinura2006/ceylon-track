/**
 * ticketing.js — Pravesha Deep Link Integration
 * Bridges Ceylon Track to the official Sri Lanka Railways ticketing ecosystem.
 * On Android: launches the Pravesha app via Android Intent (falls back to web if not installed).
 * On desktop/iOS: opens the official SLR web reservation portal in a new tab.
 */
function openPravesha() {
    const webPortalUrl = 'https://seatreservation.railway.gov.lk/mtktwebslr/';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
        // Android Intent URL: tries to open the Pravesha app directly.
        // If the app is not installed, Chrome falls back to the web portal.
        const intentUrl = 'intent://#Intent;scheme=pravesha;package=lk.bhasha.pravesha;S.browser_fallback_url='
            + encodeURIComponent(webPortalUrl) + ';end;';
        window.location.href = intentUrl;
    } else {
        // Desktop: open the SLR web reservation portal in a new tab
        window.open(webPortalUrl, '_blank');
    }
}
