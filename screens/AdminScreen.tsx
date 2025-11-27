import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import InputField from 'components/InputField';
import supabase from 'lib/supabase';
import * as Crypto from 'expo-crypto';

const CREATE_USER_URL = process.env.CREATE_USER_URL || '';

export default function AdminScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || password.length < 6) {
      Alert.alert('Validation', 'Email and password (min 6 chars) are required');
      return;
    }

    // Validate email domain
    const allowedDomains = ['@nsg.com', '@rmw.com', '@dqw.com'];
    const emailLower = email.toLowerCase();
    const isValidDomain = allowedDomains.some(domain => emailLower.endsWith(domain));
    
    if (!isValidDomain) {
      Alert.alert(
        'Invalid Domain',
        'Email domain must be one of: @nsg.com, @rmw.com, or @dqw.com'
      );
      return;
    }

    setLoading(true);
    try {
      // Hash password using expo-crypto (SHA256)
      // For better security, we'll hash password + email as salt
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + emailLower // Use email as salt for uniqueness
      );
      
      // Insert user into 'users' table (bypasses Supabase Auth)
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: emailLower,
          password_hash: hashedPassword, // Store hashed password
        })
        .select();

      if (error) {
        if (error.code === '23505') {
          // Unique violation - email already exists
          throw new Error('User with this email already exists');
        }
        throw error;
      }

      Alert.alert('Success', 'User created successfully. No email verification needed.');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.warn('create user error', err);
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 p-4">
      <Text className="text-white text-2xl font-semibold mb-4">Admin - Create User</Text>

      <InputField
        placeholder="User email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        className="mb-3"
      />
      <InputField
        isPassword
        placeholder="Temporary password"
        value={password}
        onChangeText={setPassword}
        className="mb-3"
      />

      <TouchableOpacity
        onPress={handleCreate}
        className={`rounded-lg px-4 py-3 ${loading ? 'bg-gray-600' : 'bg-green-600 active:bg-green-700'}`}
        disabled={loading}
      >
        <Text className="text-white text-center">{loading ? 'Creating...' : 'Create user'}</Text>
      </TouchableOpacity>
    </View>
  );
}
