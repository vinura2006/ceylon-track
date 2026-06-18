/**
 * SimpleCache — lightweight in-process TTL cache.
 * No external dependencies. Suitable for caching read-heavy,
 * rarely-changing data (station list, all-schedules, etc.)
 */
class SimpleCache {
    constructor() {
        this._store = new Map();
    }

    /**
     * Store a value with a TTL.
     * @param {string} key
     * @param {*} value
     * @param {number} ttlSeconds - default 60 seconds
     */
    set(key, value, ttlSeconds = 60) {
        this._store.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000
        });
    }

    /**
     * Retrieve a cached value. Returns null if missing or expired.
     * @param {string} key
     */
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this._store.delete(key);
            return null;
        }
        return entry.value;
    }

    /** Remove a specific key immediately. */
    invalidate(key) {
        this._store.delete(key);
    }

    /** Remove all cached entries. */
    clear() {
        this._store.clear();
    }

    /** Returns the number of live (non-expired) entries. */
    get size() {
        const now = Date.now();
        let count = 0;
        this._store.forEach((v) => { if (v.expiresAt > now) count++; });
        return count;
    }
}

// Export a singleton shared across the whole process
module.exports = new SimpleCache();
