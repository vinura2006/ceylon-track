require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const schedulesRoutes = require('./routes/schedules');
const stationsRoutes = require('./routes/stations');
const watchRoutes = require('./routes/watch');
const staffRoutes = require('./routes/staff');
const gpsRoutes = require('./routes/gps');
const disruptionsRoutes = require('./routes/disruptions');
const assignmentsRoutes = require('./routes/assignments');
const laststopRoutes = require('./routes/laststop');
const timetableRoutes = require('./routes/timetable');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? corsOrigin : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gps-token']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/watch', watchRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/disruptions', disruptionsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/laststop', laststopRoutes);
app.use('/api/timetable', timetableRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Fallback for SPA or not found routes in API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Listen
app.listen(PORT, () => {
    console.log(`Ceylon Track API running on port ${PORT}`);
});

module.exports = app;
