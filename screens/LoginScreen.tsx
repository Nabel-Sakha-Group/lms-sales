import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import InputField from 'components/InputField';
import { useAuth } from 'context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.length > 3 && password.length >= 6;

  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!canSubmit) return;
    const { error } = await signIn(email, password);
    if (error) {
      console.warn('Login error', error.message || error);
      // TODO: show user friendly error
      return;
    }
    // Do NOT manually navigate to AppDrawer here.
    // RootNavigator watches auth state and will switch to the AppDrawer when `user` becomes non-null.
    // Calling navigation.replace('AppDrawer') here can fail with "no screen named 'AppDrawer'" because
    // the current navigator (Login) does not have that route until auth state updates.
    // So we simply return and let AuthProvider/RootNavigator handle the navigation.
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View className='flex justify-center min-h-screen p-6 w-full items-center'>
        <View className='w-[90%] gap-6 bg-gray-800 p-6 rounded-xl shadow'>
          <Text className='text-white text-2xl font-semibold'>Welcome!</Text>
          <InputField
            placeholder='Masukkan email'
            placeholderTextColor='#9CA3AF'
            value={email}
            onChangeText={setEmail}
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='emailAddress'
            returnKeyType='next'
            autoComplete='email'
            accessibilityLabel='Input email'
          />
          <InputField
            isPassword
            placeholder='Masukkan kata sandi'
            placeholderTextColor='#9CA3AF'
            value={password}
            onChangeText={setPassword}
            textContentType='password'
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='default'
            returnKeyType='done'
            autoComplete='password'
            accessibilityLabel='Input kata sandi'
          />
          <TouchableOpacity
            disabled={!canSubmit}
            onPress={handleLogin}
            className={`rounded-lg w-full px-4 py-3 ${canSubmit ? 'bg-blue-500 active:bg-blue-600' : 'bg-gray-600'}`}
            accessibilityRole='button'
            accessibilityLabel='Tombol Login'
          >
            <Text className='text-white text-center font-medium'>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
