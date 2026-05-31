const isProduction = process.env.NODE_ENV === 'production';

function runStartupChecks() {
  const errors = [];

  // DATABASE_URL or equivalent DB connection configs
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    errors.push('Neither DATABASE_URL nor DB_HOST environment variable is configured.');
  }

  // JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is missing.');
  } else if (jwtSecret === 'default_secret') {
    if (isProduction) {
      errors.push('JWT_SECRET cannot be "default_secret" in production.');
    } else {
      console.warn('[SECURITY WARNING]: JWT_SECRET is set to "default_secret". Change this in production.');
    }
  } else if (jwtSecret.length < 32) {
    if (isProduction) {
      errors.push('JWT_SECRET must be at least 32 characters long in production.');
    } else {
      console.warn('[SECURITY WARNING]: JWT_SECRET is shorter than 32 characters.');
    }
  }

  // STAFF_ACCESS_CODE
  const staffAccessCode = process.env.STAFF_ACCESS_CODE;
  if (!staffAccessCode) {
    errors.push('STAFF_ACCESS_CODE environment variable is missing.');
  } else if (staffAccessCode === 'SLR-STAFF-2026') {
    if (isProduction) {
      errors.push('STAFF_ACCESS_CODE cannot use the default value "SLR-STAFF-2026" in production.');
    } else {
      console.warn('[SECURITY WARNING]: STAFF_ACCESS_CODE is set to the default value.');
    }
  }

  // GPS_DEVICE_TOKEN
  const gpsDeviceToken = process.env.GPS_DEVICE_TOKEN;
  if (!gpsDeviceToken) {
    errors.push('GPS_DEVICE_TOKEN environment variable is missing.');
  } else if (gpsDeviceToken === 'generate_a_random_secure_token_here') {
    if (isProduction) {
      errors.push('GPS_DEVICE_TOKEN cannot use the default placeholder in production.');
    } else {
      console.warn('[SECURITY WARNING]: GPS_DEVICE_TOKEN is using the placeholder token.');
    }
  }

  if (errors.length > 0) {
    console.error('\n=========================================');
    console.error('CRITICAL STARTUP ERROR: Environment Configuration is insecure or invalid:');
    errors.forEach((err) => console.error(` - ${err}`));
    console.error('=========================================\n');
    process.exit(1);
  } else {
    console.log('[SECURITY] All critical environment variables passed basic validation.');
  }
}

module.exports = { runStartupChecks };
