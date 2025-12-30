import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import InputField from 'components/InputField';
import { useAuth } from 'context/AuthContext';
import * as FileSystem from 'expo-file-system';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const canSubmit = email.length > 3 && password.length >= 6;

  const { signIn, enterOffline } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        await fetch('https://www.google.com', { method: 'HEAD', signal: controller.signal });
        clearTimeout(t);
        if (!cancelled) setIsOnline(true);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    };
    checkConnectivity();
    const id = setInterval(checkConnectivity, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

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

  const handleOfflineEnter = async () => {
    await enterOffline();
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View className='flex justify-center min-h-screen p-6 w-full items-center bg-white'>
        <View className='w-[90%] gap-6 bg-white p-6 rounded-xl shadow border border-orange-100'>
          <Text className='text-gray-900 text-2xl font-semibold'>Welcome!</Text>
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
            className={`rounded-lg w-full px-4 py-3 ${canSubmit ? 'bg-red-500 active:bg-red-600' : 'bg-gray-300'}`}
            accessibilityRole='button'
            accessibilityLabel='Tombol Login'
          >
            <Text className='text-white text-center font-medium'>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOfflineEnter}
            className={'rounded-lg w-full px-4 py-3 bg-orange-400 active:bg-orange-500 mt-2'}
            accessibilityRole='button'
            accessibilityLabel='Masuk Offline'
          >
            <Text className='text-white text-center font-medium'>Masuk Offline</Text>
            <Text className='text-orange-50 text-center mt-1'>
              {isOnline ? 'Buka mode Offline (hanya Downloads).' : 'Tidak ada koneksi internet. Buka mode Offline (hanya Downloads).'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
