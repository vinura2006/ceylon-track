(function () {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const BASE_URL = isLocalhost ? 'http://localhost:3000' : window.location.origin;

    const JWT_KEY = 'ceylon_track_jwt';
    const USER_KEY = 'ceylon_track_user';

    const api = {
        // STORAGE HELPERS
        getToken() {
            return localStorage.getItem(JWT_KEY);
        },
        getUser() {
            const userStr = localStorage.getItem(USER_KEY);
            try {
                return userStr ? JSON.parse(userStr) : null;
            } catch (e) {
                return null;
            }
        },
        setAuth(token, user) {
            localStorage.setItem(JWT_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        },
        clearAuth() {
            localStorage.removeItem(JWT_KEY);
            localStorage.removeItem(USER_KEY);
        },
        isLoggedIn() {
            return !!this.getToken();
        },
        hasRole(role) {
            const user = this.getUser();
            return user && user.role === role;
        },
        logout() {
            this.clearAuth();
            window.location.href = 'login.html';
        },

        // INTERNAL FETCH HELPER
        async _fetch(path, options = {}) {
            const url = `${BASE_URL}${path}`;
            const headers = options.headers || {};

            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (!(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            const config = {
                ...options,
                headers
            };

            const response = await fetch(url, config);
            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = {};
            }

            if (!response.ok) {
                const error = new Error(data.error || 'Request failed');
                error.status = response.status;
                throw error;
            }

            return data;
        },

        // PUBLIC API METHODS
        register(firstName, lastName, email, password, role = 'passenger', employeeId = null, staffAccessCode = null) {
            const body = {
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                role
            };
            if (role === 'staff') {
                body.employee_id = employeeId;
                body.staff_access_code = staffAccessCode;
            }
            return this._fetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        },
        login(loginType, emailOrEmployeeId, password) {
            const body = { login_type: loginType, password };
            if (loginType === 'staff') {
                body.employee_id = emailOrEmployeeId;
            } else {
                body.email = emailOrEmployeeId;
            }
            return this._fetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        },
        getMe() {
            return this._fetch('/api/auth/me');
        },
        getStations() {
            return this._fetch('/api/stations');
        },
        searchSchedules(from, to, date, trainClass) {
            const d = date || '';
            const c = trainClass || 'all';
            return this._fetch(`/api/schedules/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(d)}&class=${encodeURIComponent(c)}`);
        },
        getRoute(scheduleId) {
            return this._fetch(`/api/schedules/${scheduleId}/route`);
        },
        getWatches() {
            return this._fetch('/api/watch');
        },
        addWatch(scheduleId) {
            return this._fetch('/api/watch', {
                method: 'POST',
                body: JSON.stringify({ schedule_id: scheduleId })
            });
        },
        removeWatch(watchId) {
            return this._fetch(`/api/watch/${watchId}`, {
                method: 'DELETE'
            });
        },
        getStats() {
            return this._fetch('/api/staff/stats');
        },
        updateTrainStatus(scheduleId, status, delayMinutes, notes) {
            return this._fetch(`/api/staff/trains/${scheduleId}/status`, {
                method: 'POST',
                body: JSON.stringify({
                    status,
                    delay_minutes: Number(delayMinutes),
                    notes
                })
            });
        },
        getGps(trainId) {
            return this._fetch(`/api/gps/${trainId}`);
        },
        getTrainLocation(scheduleId) {
            return this._fetch(`/api/gps/${scheduleId}`);
        },
        getAllActiveTrains() {
            return this._fetch('/api/gps/all-active');
        },
        pushMobileLocation(scheduleId, lat, lng) {
            return this._fetch('/api/gps/mobile-update', {
                method: 'POST',
                body: JSON.stringify({
                    schedule_id: parseInt(scheduleId),
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                })
            });
        },
        getDisruptions() {
            return this._fetch('/api/disruptions');
        },
        getTimetables() {
            return this._fetch('/api/timetable');
        },
        bookTicket(timetableId) {
            return this._fetch(`/api/timetable/book/${timetableId}`, {
                method: 'POST'
            });
        },
        getMyAssignment() {
            return this._fetch('/api/assignments/my-active');
        },
        startAssignment(scheduleId) {
            return this._fetch('/api/assignments/start', {
                method: 'POST',
                body: JSON.stringify({ schedule_id: scheduleId })
            });
        },
        stopAssignment() {
            return this._fetch('/api/assignments/stop', {
                method: 'POST'
            });
        },
        updateLastStop(scheduleId, stationId) {
            return this._fetch('/api/laststop/update', {
                method: 'POST',
                body: JSON.stringify({ schedule_id: scheduleId, station_id: stationId })
            });
        },
        getLastStop(scheduleId) {
            return this._fetch(`/api/laststop/${scheduleId}`);
        },

        // UI HELPERS
        showToast(message, type = 'info') {
            // Remove existing toasts
            const existing = document.querySelectorAll('.api-toast');
            existing.forEach(t => t.remove());

            const toast = document.createElement('div');
            toast.className = `api-toast api-toast-${type}`;
            toast.textContent = message;

            // Simple default styling in JS if CSS is missing, but design system overrides it
            Object.assign(toast.style, {
                position: 'fixed',
                zIndex: '9999',
                padding: '12px 24px',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
            });

            if (type === 'success') {
                toast.style.background = '#059669';
            } else if (type === 'error') {
                toast.style.background = '#DC2626';
            } else {
                toast.style.background = '#0F4C75';
            }

            document.body.appendChild(toast);

            // Responsive positioning helper
            const applyResponsivePosition = () => {
                if (window.innerWidth <= 768) {
                    toast.style.bottom = '16px';
                    toast.style.left = '50%';
                    toast.style.right = 'auto';
                    toast.style.transform = 'translateX(-50%)';
                } else {
                    toast.style.bottom = '24px';
                    toast.style.right = '24px';
                    toast.style.left = 'auto';
                    toast.style.transform = 'none';
                }
            };
            applyResponsivePosition();
            window.addEventListener('resize', applyResponsivePosition);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => {
                    toast.remove();
                    window.removeEventListener('resize', applyResponsivePosition);
                }, 300);
            }, 4000);
        },

        showSpinner() {
            let spinner = document.getElementById('apiSpinnerOverlay');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'apiSpinnerOverlay';
                spinner.innerHTML = '<div class="api-spinner"></div>';
                
                // Add inline styling just in case CSS doesn't load immediately
                Object.assign(spinner.style, {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(10, 15, 30, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: '10000',
                    transition: 'opacity 0.2s ease'
                });
                
                const sEl = spinner.querySelector('.api-spinner');
                Object.assign(sEl.style, {
                    width: '50px',
                    height: '50px',
                    border: '5px solid rgba(255,255,255,0.1)',
                    borderTop: '5px solid #00B4D8',
                    borderRadius: '50%',
                    animation: 'apiSpinnerSpin 1s linear infinite'
                });

                if (!document.getElementById('apiSpinnerStyle')) {
                    const style = document.createElement('style');
                    style.id = 'apiSpinnerStyle';
                    style.textContent = `@keyframes apiSpinnerSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                    document.head.appendChild(style);
                }

                document.body.appendChild(spinner);
            }
            spinner.style.display = 'flex';
            spinner.style.opacity = '1';
        },

        hideSpinner() {
            const spinner = document.getElementById('apiSpinnerOverlay');
            if (spinner) {
                spinner.style.opacity = '0';
                setTimeout(() => {
                    spinner.style.display = 'none';
                }, 200);
            }
        },

        requireAuth() {
            if (!this.isLoggedIn()) {
                window.location.href = 'login.html';
                return false;
            }
            return true;
        },

        requireRole(role) {
            if (!this.requireAuth()) return false;
            const user = this.getUser();
            if (!user || user.role !== role) {
                this.showToast('Access denied. Insufficient permissions.', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return false;
            }
            return true;
        },

        updateNav() {
            const user = this.getUser();
            const navLinks = document.getElementById('nav-links');
            if (!navLinks) return;
            
            let linksHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="live-map.html">Live Map</a></li>
                <li><a href="timetable.html">Timetable</a></li>
                <li><a href="schedules.html">Search</a></li>
            `;

            if (user) {
                if (user.role === 'admin') {
                    linksHTML += `<li><a href="admin.html">Admin</a></li>`;
                }
                if (user.role === 'admin' || user.role === 'staff') {
                    linksHTML += `<li><a href="staff-app.html">Staff App</a></li>`;
                    linksHTML += `<li><a href="disruptions.html">Disruptions</a></li>`;
                }
                linksHTML += `
                    <li><a href="watch.html">My Watches</a></li>
                    <li><a href="#" onclick="api.logout(); return false;">Logout</a></li>
                `;
            } else {
                linksHTML += `
                    <li><a href="login.html">Login</a></li>
                    <li><a href="register.html">Register</a></li>
                `;
            }
            
            navLinks.innerHTML = linksHTML;
        }
    };

    window.api = api;
})();
