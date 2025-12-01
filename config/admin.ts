// Central place to configure admin email for the app.
// Ambil dari environment variables (.env file)

export const ADMIN_EMAIL =
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.ADMIN_EMAIL) ||
  'admin@example.com';

export default ADMIN_EMAIL;
