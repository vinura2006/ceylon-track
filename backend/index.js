require('dotenv').config();
const http       = require('http');
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests, please try again later' } });
const gpsLimiter  = rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: 'GPS rate limit exceeded' } });
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });

// Core middleware
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? corsOrigin : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gps-token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Auth middleware
const authenticate = require('./middleware/authenticate');
const authorize    = require('./middleware/authorize');

// Route modules
const authRoutes         = require('./routes/auth');
const scheduleRoutes     = require('./routes/schedules');
const stationRoutes      = require('./routes/stations');
const watchRoutes        = require('./routes/watch');
const staffRoutes        = require('./routes/staff');
const gpsRoutes          = require('./routes/gps');
const disruptionRoutes   = require('./routes/disruptions');
const assignmentRoutes   = require('./routes/assignments');
const lastStopRoutes     = require('./routes/laststop');
const timetableRoutes    = require('./routes/timetable');
const adminRoutes        = require('./routes/admin');
const journeyWatchRoutes = require('./routes/journeywatch');
const sessionRoutes      = require('./routes/sessions');

// Mount routes with rate limiters
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/schedules',    apiLimiter, scheduleRoutes);
app.use('/api/stations',     apiLimiter, stationRoutes);
app.use('/api/watch',        apiLimiter, authenticate, watchRoutes);
app.use('/api/staff',        apiLimiter, authenticate, staffRoutes);
app.use('/api/gps',          gpsLimiter, gpsRoutes);
app.use('/api/disruptions',  apiLimiter, disruptionRoutes);
app.use('/api/assignments',  apiLimiter, authenticate, assignmentRoutes);
app.use('/api/laststop',     apiLimiter, lastStopRoutes);
app.use('/api/timetable',    apiLimiter, timetableRoutes);
app.use('/api/admin',        apiLimiter, authenticate, authorize(['admin', 'ceylon-track-admin']), adminRoutes);
app.use('/api/journeywatch', apiLimiter, authenticate, journeyWatchRoutes);
app.use('/api/sessions',     apiLimiter, sessionRoutes);

// Health check
app.get('/health', async (req, res) => {
    try {
        const pool = require('./db/pool');
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch(e) {
        res.status(503).json({ status: 'error', db: 'disconnected', error: e.message });
    }
});

// Users theme endpoint
app.put('/api/users/theme', authenticate, async (req, res, next) => {
    try {
        const pool = require('./db/pool');
        const { theme } = req.body;
        const allowed = ['dark-navy', 'midnight', 'light', 'sunset'];
        if (!allowed.includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme' });
        }
        await pool.query('UPDATE users SET theme_preference = $1 WHERE id = $2', [theme, req.user.userId]);
        res.json({ success: true, theme });
    } catch(e) { next(e); }
});

// Unknown API routes — return JSON, not HTML
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Centralized error handler — MUST be last, MUST have 4 args
app.use((err, req, res, next) => {
    console.error('[ERROR]', new Date().toISOString(), req.method, req.path, err.message);
    if (process.env.NODE_ENV !== 'production') console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(status).json({ error: message });
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
const { setupWebSocket } = require('./websocket');
const ws = setupWebSocket(server);

const PORT = process.env.PORT || 3000;

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
    server.listen(PORT, () => {
        console.log('Ceylon Track server running on port ' + PORT);
        try {
            const { startNotificationJob } = require('./jobs/notificationChecker');
            startNotificationJob();
        } catch(e) { console.warn('Notification checker failed to start:', e.message); }
    });
}

module.exports = { app, server, ws };
