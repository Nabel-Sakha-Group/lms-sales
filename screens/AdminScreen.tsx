import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import InputField from 'components/InputField';
import { Container } from 'components/Container';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@env';
import { createClient } from '@supabase/supabase-js';

export default function AdminScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || password.length < 6) {
      Alert.alert('Validation', 'Email and password (min 6 chars) are required');
      return;
    }

    setLoading(true);
    try {
      // Create Supabase admin client
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Create user via Supabase Auth Admin API
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: isAdmin ? 'admin' : 'user',
          created_by: 'admin_screen',
          created_at: new Date().toISOString(),
        },
      });

      if (error) {
        if (error.message.includes('already been registered')) {
          throw new Error('User with this email already exists');
        }
        throw error;
      }

      Alert.alert(
        'Success', 
        `User created successfully!\n\nEmail: ${data.user.email}\nRole: ${isAdmin ? 'Admin' : 'User'}\nEmail Confirmed: Yes`,
        [{ text: 'OK' }]
      );
      
      // Reset form
      setEmail('');
      setPassword('');
      setIsAdmin(false);
    } catch (err: any) {
      console.error('Create user error:', err);
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <ScrollView className="flex-1 p-4">
        <Text className="text-white text-2xl font-semibold mb-2">Create New User</Text>
        <Text className="text-gray-400 text-sm mb-6">
          User akan masuk ke Supabase Authentication dengan email auto-confirmed
        </Text>

        <InputField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-3"
        />
        
        <InputField
          isPassword
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          className="mb-4"
        />

        <View className="flex-row items-center justify-between mb-6 bg-slate-800 p-4 rounded-lg">
          <View>
            <Text className="text-white text-base font-semibold">Set as Admin</Text>
            <Text className="text-gray-400 text-sm">
              {isAdmin ? 'User akan punya akses admin' : 'User biasa tanpa akses admin'}
            </Text>
          </View>
          <Switch
            value={isAdmin}
            onValueChange={setIsAdmin}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor={isAdmin ? '#60a5fa' : '#9ca3af'}
          />
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          className={`rounded-lg px-4 py-4 ${loading ? 'bg-gray-600' : 'bg-green-600 active:bg-green-700'}`}
          disabled={loading}
        >
          <Text className="text-white text-center font-semibold text-base">
            {loading ? 'Creating...' : `Create ${isAdmin ? 'Admin' : 'User'}`}
          </Text>
        </TouchableOpacity>

        <View className="mt-8 bg-slate-800 p-4 rounded-lg">
          <Text className="text-white font-semibold mb-2">ℹ️ Info:</Text>
          <Text className="text-gray-300 text-sm mb-1">✅ Email auto-confirmed (tidak perlu verifikasi)</Text>
          <Text className="text-gray-300 text-sm mb-1">✅ Masuk ke Supabase Authentication</Text>
          <Text className="text-gray-300 text-sm mb-1">✅ User bisa langsung login</Text>
          <Text className="text-gray-300 text-sm">
            {isAdmin 
              ? '🔐 Admin: Bisa akses semua fitur + admin panel'
              : '👤 User: Akses terbatas sesuai domain'}
          </Text>
        </View>

        <View className="mt-4 bg-blue-900 p-4 rounded-lg">
          <Text className="text-blue-200 font-semibold mb-2">📋 Admin Detection:</Text>
          <Text className="text-blue-100 text-sm mb-1">• Role metadata = &quot;admin&quot;</Text>
          <Text className="text-blue-100 text-sm">• Email domain @nsg.com</Text>
        </View>
      </ScrollView>
    </Container>
  );
}
