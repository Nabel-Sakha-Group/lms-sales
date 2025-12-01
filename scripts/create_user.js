#!/usr/bin/env node
// scripts/create_user.js
// Usage: node scripts/create_user.js user@example.com password123

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 [Create User] Using Supabase URL:', SUPABASE_URL);
console.log('🔍 [Create User] Service Role Key:', SUPABASE_SERVICE_ROLE_KEY ? 'Loaded (length: ' + SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

function maskKey(k) {
  if (!k) return '';
  const len = k.length;
  if (len <= 8) return '****';
  return '****' + k.slice(-4) + ` (len=${len})`;
}

// Quick validation
if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ') || SUPABASE_SERVICE_ROLE_KEY.length < 60) {
  console.error('Supabase service role key looks invalid or truncated:', maskKey(SUPABASE_SERVICE_ROLE_KEY));
  console.error('Make sure you copied the full SERVICE_ROLE key from Supabase project settings.');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/create_user.js <email> <password>');
  console.error('Example: node scripts/create_user.js user1@company.com password123');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log(`\n📧 Creating regular user: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'user', // Mark as regular user
        created_by: 'create_user_script',
      },
    });
    
    if (error) throw error;
    
    console.log('✅ User created successfully!');
    console.log('👤 User ID:', data.user.id);
    console.log('📧 Email:', data.user.email);
    console.log('🔐 Role: user (bukan admin)');
    console.log('✉️ Email Confirmed: Yes');
    console.log('\n💡 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n✨ User ini:');
    console.log('   ✅ Masuk ke Supabase Authentication');
    console.log('   ✅ Email auto-confirmed');
    console.log('   ✅ Role = "user" (bukan admin)');
    console.log('   ❌ Tidak punya akses admin');
  } catch (err) {
    console.error('❌ Error creating user:', (err && err.message) || err);
    
    if (err.message && err.message.includes('already been registered')) {
      console.error('\n💡 Tip: User dengan email ini sudah ada. Gunakan email lain atau hapus user lama di Supabase Dashboard.');
    }
    
    process.exit(1);
  }
}

main();
