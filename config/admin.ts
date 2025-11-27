// Central place to configure admin email for the app.
// Edit this file during development to set the admin account email.
// In production you can wire this to environment variables or secret manager.

export const ADMIN_EMAIL =
  // try process.env first (works when bundler injects env), otherwise hardcode
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.ADMIN_EMAIL) ||
  'admin@nsg.com';

export default ADMIN_EMAIL;
