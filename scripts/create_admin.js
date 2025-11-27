#!/usr/bin/env node
// scripts/create_admin.js
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create_admin.js admin@example.com password123

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment');
  process.exit(1);
}

function maskKey(k) {
  if (!k) return '';
  const len = k.length;
  if (len <= 8) return '****';
  return '****' + k.slice(-4) + ` (len=${len})`;
}

// Quick validation to help catch truncated keys passed in shells
if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ') || SUPABASE_SERVICE_ROLE_KEY.length < 60) {
  console.error('Supabase service role key looks invalid or truncated:', maskKey(SUPABASE_SERVICE_ROLE_KEY));
  console.error('Make sure you copied the full SERVICE_ROLE key from Supabase project settings. Do NOT commit this key to source control.');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/create_admin.js <email> <password>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log('Admin user created:', data);
    console.log('Now set ADMIN_EMAIL environment variable in your app to', email);
  } catch (err) {
    console.error('Error creating admin:', (err && err.message) || err);
    // Provide a hint for common cause
    console.error('Hint: "Invalid API key" likely means the provided SUPABASE_SERVICE_ROLE_KEY is incorrect, truncated, or for a different project.');
    process.exit(1);
  }
}

main();
