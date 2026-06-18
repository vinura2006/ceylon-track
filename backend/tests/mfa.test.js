const request = require('supertest');
const speakeasy = require('speakeasy');
const { app } = require('../index');

describe('MFA API Integration Tests', () => {
    const unique = () => `mfa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let token = null;
    let email = null;
    let password = 'Password123!';
    let user = null;

    beforeAll(async () => {
        email = `${unique()}@example.com`;
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                first_name: 'MFA',
                last_name: 'TestUser',
                email,
                password,
                role: 'passenger'
            });
        
        token = res.body.token;
        user = res.body.user;
    });

    describe('GET /api/auth/me', () => {
        test('Should return user object with mfaEnabled: false initially', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.mfaEnabled).toBe(false);
        });
    });

    describe('POST /api/mfa/setup', () => {
        test('Should generate temporary secret and QR code URL', async () => {
            const res = await request(app)
                .post('/api/mfa/setup')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(res.body.secret).toBeDefined();
            expect(res.body.qrCode).toBeDefined();
            expect(typeof res.body.secret).toBe('string');
            expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
        });
    });

    describe('POST /api/mfa/verify-setup', () => {
        test('Should fail verification with incorrect code', async () => {
            const res = await request(app)
                .post('/api/mfa/verify-setup')
                .set('Authorization', `Bearer ${token}`)
                .send({ code: '000000' });
            
            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        test('Should succeed and enable MFA with correct TOTP code', async () => {
            // First, trigger setup again to get the secret
            const setupRes = await request(app)
                .post('/api/mfa/setup')
                .set('Authorization', `Bearer ${token}`);
            
            const secret = setupRes.body.secret;
            
            // Generate valid code
            const code = speakeasy.totp({
                secret: secret,
                encoding: 'base32'
            });

            const verifyRes = await request(app)
                .post('/api/mfa/verify-setup')
                .set('Authorization', `Bearer ${token}`)
                .send({ code });
            
            expect(verifyRes.status).toBe(200);
            expect(verifyRes.body.success).toBe(true);

            // Double check that mfaEnabled is now true in /me
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(meRes.body.user.mfaEnabled).toBe(true);
        });
    });

    describe('MFA Login Challenge Flow', () => {
        let mfaToken = null;

        test('Step 1: Credentials check should return mfaRequired: true and mfaToken', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email,
                    password,
                    login_type: 'passenger'
                });
            
            expect(res.status).toBe(200);
            expect(res.body.mfaRequired).toBe(true);
            expect(res.body.mfaToken).toBeDefined();
            mfaToken = res.body.mfaToken;
        });

        test('Step 2: Should fail login with incorrect TOTP code', async () => {
            const res = await request(app)
                .post('/api/mfa/verify')
                .send({
                    code: '000000',
                    mfaToken
                });
            
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
        });

        test('Step 2: Should succeed login and return access tokens with correct TOTP code', async () => {
            // Fetch secret from DB
            const pool = require('../db/pool');
            const userDb = await pool.query('SELECT mfa_secret FROM users WHERE email = $1', [email]);
            const secret = userDb.rows[0].mfa_secret;

            const code = speakeasy.totp({
                secret: secret,
                encoding: 'base32'
            });

            const res = await request(app)
                .post('/api/mfa/verify')
                .send({
                    code,
                    mfaToken
                });
            
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toBeDefined();
            expect(res.body.user.mfaEnabled).toBe(true);
            
            // Update auth token for subsequent tests
            token = res.body.token;
        });
    });

    describe('POST /api/mfa/disable', () => {
        test('Should fail if password is wrong', async () => {
            const res = await request(app)
                .post('/api/mfa/disable')
                .set('Authorization', `Bearer ${token}`)
                .send({ password: 'wrongpassword' });
            
            expect(res.status).toBe(401);
        });

        test('Should succeed if password is correct', async () => {
            const res = await request(app)
                .post('/api/mfa/disable')
                .set('Authorization', `Bearer ${token}`)
                .send({ password });
            
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Double check that mfaEnabled is false in /me
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(meRes.body.user.mfaEnabled).toBe(false);
        });
    });
});
