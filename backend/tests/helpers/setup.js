// Test setup file
// Add any global test setup logic here if needed

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
process.env.RUNTIME_MODE = process.env.RUNTIME_MODE || 'COMPETITION_SANDBOX';
process.env.COMPETITION_SANDBOX = process.env.COMPETITION_SANDBOX || '1';
process.env.PRODUCTION_LIVE = process.env.PRODUCTION_LIVE || '0';
