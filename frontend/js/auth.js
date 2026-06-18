/**
 * Ceylon Track Auth Module
 * Stores access token in memory only (never localStorage/sessionStorage).
 */
const CeylonAuth = (() => {
    let _accessToken = null;

    function setToken(token) { _accessToken = token; }
    function getToken()      { return _accessToken; }
    function clearToken()    { _accessToken = null; }

    async function refreshAccessToken() {
        try {
            const res = await fetch(apiUrl('/api/auth/refresh'), {
                method: 'POST',
                credentials: 'include', // sends httpOnly cookie automatically
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) { clearToken(); return null; }
            const data = await res.json();
            setToken(data.token);
            return data.token;
        } catch (e) {
            clearToken();
            return null;
        }
    }

    async function authorizedFetch(url, options = {}) {
        let token = getToken();
        if (!token) token = await refreshAccessToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        });

        // Auto-retry once on 401 (token may have just expired)
        if (response.status === 401) {
            token = await refreshAccessToken();
            if (!token) throw new Error('Session expired');
            return fetch(url, {
                ...options,
                headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
            });
        }
        return response;
    }

    return { setToken, getToken, clearToken, refreshAccessToken, authorizedFetch };
})();
