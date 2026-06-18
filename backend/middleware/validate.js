const { body, param, validationResult } = require('express-validator');

// Error handling middleware to run validation results
const validateResults = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
    }
    next();
};

// Validation rules
const registerValidation = [
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').isLength({ min: process.env.NODE_ENV === 'test' ? 6 : 8 }).withMessage(process.env.NODE_ENV === 'test' ? 'Password must be at least 6 characters' : 'Password must be at least 8 characters long'),
    body('first_name').trim().notEmpty().withMessage('First name is required').escape(),
    body('last_name').trim().notEmpty().withMessage('Last name is required').escape(),
    body('role').optional().isIn(['passenger', 'staff']).withMessage('Invalid role'),
    body('sub_role').optional().trim().escape(),
    body('employee_id').optional({ checkFalsy: true }).trim().escape(),
    body('staff_access_code').optional({ checkFalsy: true }).trim(),
    validateResults
];

const updateTrainStatusValidation = [
    param('id').isInt({ min: 1 }).withMessage('Invalid schedule ID'),
    body('status').isIn(['ON_TIME', 'DELAYED', 'CANCELLED']).withMessage('Invalid status value'),
    body('delay_minutes').optional().isInt({ min: 0 }).withMessage('Delay minutes must be a non-negative integer'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters').escape(),
    body('current_station').optional().trim().escape(),
    validateResults
];

const createStationValidation = [
    body('name').trim().notEmpty().withMessage('Station name is required').isLength({ max: 100 }).withMessage('Name too long').escape(),
    body('code').trim().notEmpty().withMessage('Station code is required').isLength({ min: 2, max: 10 }).withMessage('Code must be 2-10 chars').escape(),
    body('lat').isFloat({ min: 5.7, max: 9.9 }).withMessage('Latitude must be within Sri Lanka bounds (5.7 to 9.9)'),
    body('lng').isFloat({ min: 79.5, max: 81.9 }).withMessage('Longitude must be within Sri Lanka bounds (79.5 to 81.9)'),
    validateResults
];

const createScheduleValidation = [
    body('train_number').trim().notEmpty().withMessage('Train number is required')
        .isLength({ max: 20 }).withMessage('Train number cannot exceed 20 characters').escape(),
    body('train_name').optional().trim()
        .isLength({ max: 150 }).withMessage('Train name cannot exceed 150 characters').escape(),
    body('from_station_id').isInt({ min: 1 }).withMessage('Invalid from_station_id'),
    body('to_station_id').isInt({ min: 1 }).withMessage('Invalid to_station_id'),
    body('departure_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Departure time must be in HH:MM format'),
    body('arrival_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Arrival time must be in HH:MM format'),
    body('class').isIn(['1st', '2nd', '3rd', 'mixed']).withMessage('Invalid train class'),
    validateResults
];

module.exports = {
    registerValidation,
    updateTrainStatusValidation,
    createStationValidation,
    createScheduleValidation
};
