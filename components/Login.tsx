import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Validasi input
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email dan password harus diisi!');
      return;
    }

    // Handle login logic here
    console.log('Login:', { email, password });
    
    // Navigate to home
    onLogin();
  };

  return (
    <ScrollView className='bg-white'>
      <View className='min-h-screen w-full px-6 justify-center'>
        {/* Header */}
        <View className='mb-10'>
          <Text className='text-3xl font-bold text-gray-800 mb-2'>
            Welcome Back
          </Text>
          <Text className='text-gray-500 text-base'>
            Sign in to continue to LMS Sales
          </Text>
        </View>

        {/* Form */}
        <View className='space-y-4'>
          {/* Email Input */}
          <View className='mb-4'>
            <Text className='text-gray-700 text-sm font-medium mb-2'>
              Email
            </Text>
            <TextInput
              className='border border-gray-300 rounded-lg px-4 py-3 text-base'
              placeholder='Enter your email'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
            />
          </View>

          {/* Password Input */}
          <View className='mb-6'>
            <Text className='text-gray-700 text-sm font-medium mb-2'>
              Password
            </Text>
            <TextInput
              className='border border-gray-300 rounded-lg px-4 py-3 text-base'
              placeholder='Enter your password'
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className='bg-blue-600 rounded-lg py-4 items-center'
            onPress={handleLogin}
          >
            <Text className='text-white text-base font-semibold'>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}