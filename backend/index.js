const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const trainRoutes = require('./routes/trains');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Ceylon Track API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/trains', trainRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Ceylon Track API',
        description: 'Real-time Passenger Information System for Sri Lankan Railway',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me'
            },
            trains: {
                list: 'GET /api/trains/',
                search: 'GET /api/trains/search?from=STATION&to=STATION&date=YYYY-MM-DD',
                route: 'GET /api/trains/:id/route'
            },
            schedules: {
                search: 'GET /api/schedules/search?from=CODE&to=CODE&date=YYYY-MM-DD',
                detail: 'GET /api/schedules/:id'
            },
            health: 'GET /health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
====================================
  Ceylon Track API Server
====================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  Database: ${process.env.DB_NAME || 'ceylontrack'}
  
  Endpoints:
    - http://localhost:${PORT}/
    - http://localhost:${PORT}/health
    - http://localhost:${PORT}/api/auth
    - http://localhost:${PORT}/api/schedules
====================================
    `);
});

module.exports = app;
