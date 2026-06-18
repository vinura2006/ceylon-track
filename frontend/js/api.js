(function () {
    // Auto-detect host — works on localhost, LAN IP, or any deployed URL
    const BASE_URL = window.location.origin;

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
            // refreshToken is now stored as an httpOnly cookie by the server
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
            this._fetch('/api/auth/logout', { 
                method: 'POST',
                credentials: 'include' // ensures the httpOnly cookie is sent so server can clear it
            }).catch(function(){});
            this.clearAuth();
            window.location.href = 'login.html';
        },
        getHomeUrl() {
            var user = this.getUser();
            if (user) {
                if (user.role === 'admin' || user.role === 'ceylon-track-admin') {
                    return 'admin.html';
                }
                if (user.role === 'staff') {
                    return 'staff-app.html';
                }
            }
            return 'index.html';
        },
        isStationMaster() {
            const user = this.getUser();
            return user && user.role === 'staff' && (user.subRole === 'station_master' || user.sub_role === 'station_master');
        },
        needsStationSetup() {
            // Unimplemented for now, returning false prevents the redirect crash.
            return false;
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
                if (response.status === 401) {
                    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
                    const isRefreshRequest = path.includes('/api/auth/refresh');
                    const isAuthRequest = path.includes('/api/auth/');
                    
                    if (!isRefreshRequest && !isAuthPage) {
                        try {
                            // Attempt silent token refresh using httpOnly cookie (no token in body needed)
                            const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            if (refreshRes.ok) {
                                const refreshData = await refreshRes.json();
                                api.setAuth(refreshData.token, refreshData.user);
                                
                                const retryHeaders = { ...headers };
                                retryHeaders['Authorization'] = `Bearer ${refreshData.token}`;
                                const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
                                
                                let retryData;
                                try {
                                    retryData = await retryResponse.json();
                                } catch (e) {
                                    retryData = {};
                                }
                                
                                if (retryResponse.ok) {
                                    return retryData;
                                }
                            }
                        } catch (refreshErr) {
                            console.error('Auto refresh token failed:', refreshErr);
                        }
                    }

                    api.clearAuth();
                    if (!isAuthPage && !isAuthRequest) {
                        api.showToast('Your session has expired. Please log in again.', 'error');
                        setTimeout(() => { window.location.href = '/login.html'; }, 1500);
                    }
                }
                const error = new Error(data.error || 'Request failed');
                error.status = response.status;
                throw error;
            }

            return data;
        },

        // PUBLIC API METHODS
        register(firstName, lastName, email, password, role = 'passenger', employeeId = null, staffAccessCode = null, subRole = null) {
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
                body.sub_role = subRole || 'staff';
            }
            return this._fetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        },
        login(loginType, emailOrEmployeeId, password) {
            const body = { login_type: loginType, password };
            if (loginType === 'staff') {
                if (emailOrEmployeeId.includes('@')) {
                    body.email = emailOrEmployeeId;
                } else {
                    body.employee_id = emailOrEmployeeId;
                }
            } else if (loginType === 'admin') {
                body.email = emailOrEmployeeId;
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
        pushMobileLocation({ scheduleId, lat, lng, accuracy, heading, speed }) {
            return this._fetch('/api/gps/mobile-update', {
                method: 'POST',
                body: JSON.stringify({
                    schedule_id: parseInt(scheduleId),
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    accuracy: accuracy ? parseFloat(accuracy) : undefined,
                    heading: heading ? parseFloat(heading) : undefined,
                    speed: speed ? parseFloat(speed) : undefined
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
        canBroadcastGPS() {
            var user = this.getUser();
            return user && user.role === 'staff' && !this.isStationMaster();
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

        // Admin staff management
        getStaffList: () => api._fetch('/api/auth/staff'),
        updateStaffStatus: (staffId, status, rejection_reason) =>
            api._fetch('/api/auth/staff/' + staffId + '/status', {
                method: 'PUT',
                body: JSON.stringify({ status, rejection_reason: rejection_reason || null })
            }),
            
        // Admin Management
        getAnalytics: () => api._fetch('/api/admin/analytics'),
        getAdminSchedules: () => api._fetch('/api/admin/schedules'),
        deleteSchedule: (id) => api._fetch('/api/admin/schedules/' + id, { method: 'DELETE' }),
        createSchedule: (scheduleData) => api._fetch('/api/staff/schedules', { 
            method: 'POST', 
            body: JSON.stringify(scheduleData) 
        }),
        createStation: (stationData) => api._fetch('/api/staff/stations', {
            method: 'POST',
            body: JSON.stringify(stationData)
        }),
        deleteStation: (id) => api._fetch('/api/admin/stations/' + id, { method: 'DELETE' }),

        // Timetable Enhancements API Methods
        getGroupedTimetables: () => api._fetch('/api/timetable/grouped'),
        getTimetableRoutes: () => api._fetch('/api/timetable/routes'),
        createTimetableEntry: (data) => api._fetch('/api/timetable', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        updateTimetableEntry: (id, data) => api._fetch('/api/timetable/' + id, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        deleteTimetableEntry: (id) => api._fetch('/api/timetable/' + id, { method: 'DELETE' }),
        updateTimetableStops: (id, stops) => api._fetch('/api/timetable/' + id + '/stops', {
            method: 'POST',
            body: JSON.stringify({ stops })
        }),
        getTimetableStopsList: (id) => api._fetch('/api/timetable/' + id),
        proposeTimetableChange: (data) => api._fetch('/api/timetable/change-request', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getTimetableChangeRequests: () => api._fetch('/api/timetable/change-requests'),
        getMyTimetableChangeRequests: () => api._fetch('/api/timetable/my-change-requests'),
        reviewTimetableChangeRequest: (id, status, review_note) => api._fetch('/api/timetable/change-requests/' + id, {
            method: 'PUT',
            body: JSON.stringify({ status, review_note })
        }),

        // Theme
        saveTheme: (theme) =>
            api._fetch('/api/users/theme', { method: 'PUT', body: JSON.stringify({ theme }) }),

        // Sessions
        startSession: (scheduleId) =>
            api._fetch('/api/sessions/start', { method: 'POST', body: JSON.stringify({ schedule_id: scheduleId }) }),
        stopSession: () =>
            api._fetch('/api/sessions/stop', { method: 'POST' }),
        getMySession: () =>
            api._fetch('/api/sessions/my-active'),
        getActiveSessions: () =>
            api._fetch('/api/sessions/active'),
        cancelSession: (sessionId) =>
            api._fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }),

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
            let hasRole = false;
            if (user) {
                if (role === 'admin' && (user.role === 'admin' || user.role === 'ceylon-track-admin')) {
                    hasRole = true;
                } else if (user.role === role) {
                    hasRole = true;
                }
            }

            if (!hasRole) {
                this.showToast('Access denied. Insufficient permissions.', 'error');
                setTimeout(() => {
                    window.location.href = this.getHomeUrl();
                }, 2000);
                return false;
            }
            return true;
        },

        updateNav() {
            const user = this.getUser();
            const navLinks = document.getElementById('nav-links');
            
            // Dynamically point the brand logo to the user's dashboard home
            const brandEl = document.querySelector('.navbar-brand');
            if (brandEl) {
                brandEl.setAttribute('href', this.getHomeUrl());
            }

            if (!navLinks) return;
            
            let linksHTML = '';
            const role = user ? user.role : 'passenger';

            if (role === 'admin' || role === 'ceylon-track-admin') {
                linksHTML = '<li><a href="live-map.html">Live Map</a></li>'
                    + '<li><a href="admin.html">Dashboard</a></li>'
                    + '<li><a href="settings.html">Settings</a></li>'
                    + '<li><a href="#" onclick="api.logout(); return false;">Logout</a></li>';
            } else if (role === 'staff') {
                linksHTML = '<li><a href="index.html">Search</a></li>'
                    + '<li><a href="live-map.html">Live Map</a></li>'
                    + '<li><a href="staff-app.html">Dashboard</a></li>'
                    + '<li><a href="settings.html">Settings</a></li>'
                    + '<li><a href="#" onclick="api.logout(); return false;">Logout</a></li>';
            } else if (user) {
                linksHTML = '<li><a href="index.html">Search</a></li>'
                    + '<li><a href="live-map.html">Live Map</a></li>'
                    + '<li><a href="timetable.html">Timetable</a></li>'
                    + '<li><a href="watch.html">My Watches</a></li>'
                    + '<li><a href="settings.html">Settings</a></li>'
                    + '<li><a href="#" onclick="api.logout(); return false;">Logout</a></li>';
            } else {
                linksHTML = '<li><a href="index.html">Search</a></li>'
                    + '<li><a href="live-map.html">Live Map</a></li>'
                    + '<li><a href="timetable.html">Timetable</a></li>'
                    + '<li><a href="settings.html">Settings</a></li>'
                    + '<li><a href="login.html">Login</a></li>';
            }

            navLinks.innerHTML = linksHTML;

            // Automatically setup mobile menu toggle
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            if (mobileMenuBtn) {
                const newBtn = mobileMenuBtn.cloneNode(true);
                mobileMenuBtn.parentNode.replaceChild(newBtn, mobileMenuBtn);
                newBtn.addEventListener('click', () => {
                    navLinks.classList.toggle('open');
                    newBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
                });
            }
        }
    };

    window.api = api;
})();
