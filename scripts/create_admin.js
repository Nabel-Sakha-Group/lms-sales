#!/usr/bin/env node
// scripts/create_admin.js
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create_admin.js admin@example.com password123

require('dotenv').config();

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
  console.log(`\n📧 Creating admin user: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        created_by: 'create_admin_script',
      },
    });
    
    if (error) throw error;
    
    console.log('✅ Admin user created successfully!');
    console.log('👤 User ID:', data.user.id);
    console.log('📧 Email:', data.user.email);
    console.log('🔐 Role: admin');
    console.log('✉️ Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('\n💡 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n✨ User akan otomatis dikenali sebagai admin berdasarkan:');
    console.log('   1. User metadata role = "admin"');
    console.log('   2. Email domain @nsg.com (jika ada)');
    console.log('   3. Created via Supabase Auth');
  } catch (err) {
    console.error('❌ Error creating admin:', (err && err.message) || err);
    console.error('Hint: "Invalid API key" likely means SUPABASE_SERVICE_ROLE_KEY is incorrect or for different project.');
    process.exit(1);
  }
}

main();
