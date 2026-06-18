const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');
const { logAction } = require('../utils/auditLogger');
const authRouter = require('./auth'); // We will export the helper methods from authRouter

const isProduction = process.env.NODE_ENV === 'production';

// POST /api/mfa/setup - Generate secret and QR code for scanning
router.post('/setup', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const email = req.user.email;

        // Generate speakeasy secret
        const secret = speakeasy.generateSecret({
            name: `Ceylon Track (${email})`,
            issuer: 'Ceylon Track'
        });

        // Store temporary secret, mfa_enabled remains false until verified
        await pool.query(
            'UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2',
            [secret.base32, userId]
        );

        // Generate QR code data URL
        const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

        await logAction(userId, 'MFA_SETUP_INITIATED', 'user', userId, { email }, req.ip);

        return res.status(200).json({
            secret: secret.base32,
            qrCode: qrCodeDataUrl
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/mfa/verify-setup - Verify and enable MFA
router.post('/verify-setup', authenticate, async (req, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.user.userId;

        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        // Fetch user's temporary secret
        const result = await pool.query('SELECT mfa_secret, email FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        if (!user.mfa_secret) {
            return res.status(400).json({ error: 'MFA setup has not been initiated' });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code,
            window: 1 // +/- 30 second window tolerance
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
        }

        // Enable MFA
        await pool.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);

        await logAction(userId, 'MFA_ENABLED', 'user', userId, { email: user.email }, req.ip);

        return res.status(200).json({ success: true, message: 'MFA enabled successfully' });
    } catch (error) {
        next(error);
    }
});

// POST /api/mfa/disable - Disable MFA (requires password verification)
router.post('/disable', authenticate, async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ error: 'Password is required to disable MFA' });
        }

        // Fetch user details
        const result = await pool.query('SELECT password_hash, email FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Disable MFA
        await pool.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1', [userId]);

        await logAction(userId, 'MFA_DISABLED', 'user', userId, { email: user.email }, req.ip);

        return res.status(200).json({ success: true, message: 'MFA disabled successfully' });
    } catch (error) {
        next(error);
    }
});

// POST /api/mfa/verify - Verify TOTP code during step 2 login
router.post('/verify', async (req, res, next) => {
    try {
        const { code, mfaToken } = req.body;

        if (!code || !mfaToken) {
            return res.status(400).json({ error: 'MFA token and verification code are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'MFA token has expired or is invalid. Please restart login.' });
        }

        if (!decoded.mfaRequired || !decoded.userId) {
            return res.status(400).json({ error: 'Invalid MFA token payload' });
        }

        // Get user and secret
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (!user.mfa_enabled || !user.mfa_secret) {
            return res.status(400).json({ error: 'MFA is not enabled for this user' });
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code,
            window: 1 // +/- 30 second window tolerance
        });

        if (!verified) {
            await logAction(user.id, 'MFA_LOGIN_FAILED', 'user', user.id, { email: user.email, reason: 'Invalid TOTP code' }, req.ip);
            return res.status(401).json({ error: 'Invalid MFA code' });
        }

        // Generate final access token and refresh token
        // Using helpers exposed by authRouter
        const token = authRouter.buildJWT(user);
        const refreshToken = await authRouter.generateAndStoreRefreshToken(user.id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        await logAction(user.id, 'USER_LOGIN_MFA_SUCCESS', 'user', user.id, { email: user.email }, req.ip);

        return res.status(200).json({
            token,
            user: authRouter.buildUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
