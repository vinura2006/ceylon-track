/**
 * Ceylon Track — Frontend Configuration
 * Central place for app-wide constants and URL helpers.
 * Include this script FIRST in every HTML page (before api.js, before any other scripts).
 */
const CT_CONFIG = Object.freeze({
    APP_NAME:  'Ceylon Track',
    API_BASE:  window.location.origin,
    WS_BASE:   window.location.origin.replace(/^http/, 'ws'),
    VERSION:   '1.0.0',
});

/**
 * Build a full API URL from a path.
 * @param {string} path - e.g. '/api/schedules/search'
 * @returns {string} Full URL
 */
function apiUrl(path) {
    return `${CT_CONFIG.API_BASE}${path}`;
}

/**
 * Build a WebSocket URL from a path.
 * @param {string} path - e.g. '/ws'
 * @returns {string} Full WS URL
 */
function wsUrl(path) {
    return `${CT_CONFIG.WS_BASE}${path}`;
}
