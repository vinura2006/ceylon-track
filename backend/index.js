require('dotenv').config();
const { runStartupChecks } = require('./startupChecks');
runStartupChecks();
const http       = require('http');
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for correct client IP detection behind reverse proxies like Railway
app.set('trust proxy', 1);

// Security headers with customized Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://unpkg.com", "https://*.basemaps.cartocdn.com", "https://*.tile.openstreetmap.org", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org"],
            connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "ws://localhost:*"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },
}));

// Rate limiters
const authLimiter = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests, please try again later' } }) : (req, res, next) => next();
const gpsLimiter  = isProduction ? rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: 'GPS rate limit exceeded' } }) : (req, res, next) => next();
const apiLimiter  = isProduction ? rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }) : (req, res, next) => next();

// Core middleware
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: isProduction ? corsOrigin : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gps-token']
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Auth middleware
const authenticate = require('./middleware/authenticate');
const authorize    = require('./middleware/authorize');

// Route modules
const authRoutes         = require('./routes/auth');
const mfaRoutes          = require('./routes/mfa');
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
app.use('/api/mfa',          apiLimiter, mfaRoutes);
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
        try {
            const { startReliabilityJob } = require('./jobs/reliabilityRefresh');
            startReliabilityJob();
        } catch(e) { console.warn('Reliability refresh job failed to start:', e.message); }
        try {
            const { startCleanupJob } = require('./jobs/cleanup');
            startCleanupJob();
        } catch(e) { console.warn('Cleanup job failed to start:', e.message); }
    });
}

module.exports = { app, server, ws };
