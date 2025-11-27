import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuth } from 'context/AuthContext';

// Logo mapping for each domain using local assets
const DOMAIN_LOGOS = {
  nsg: require('../assets/Nabel.png'),
  rmw: require('../assets/RMW.webp'),
  dqw: require('../assets/DQW.png'),
  admin: require('../assets/icon.png'), // Use app icon for admin
};

export default function HomeScreen() {
  const { user, userDomain } = useAuth();
  
  // Get logo based on user domain
  const logo = userDomain ? DOMAIN_LOGOS[userDomain as keyof typeof DOMAIN_LOGOS] : require('../assets/icon.png');

  const videos = [
    { id: '1', title: 'Belajar React Native Dasar', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '2', title: 'Mengenal TypeScript di Project', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '3', title: 'Optimasi Performance Aplikasi', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '4', title: 'Integrasi API dengan Axios', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '5', title: 'Styling dengan NativeWind', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '6', title: 'Navigasi dengan React Navigation', thumbnail: 'https://via.placeholder.com/300x200' },
    { id: '7', title: 'State Management Modern', thumbnail: 'https://via.placeholder.com/300x200' },
  ];

  return (
    <ScrollView>
      <View className='min-h-screen p-6'>
        <View className='bg-gray-800 rounded-xl p-6 mb-4'>
          <Text className='text-white text-base'>Selamat datang di Dashboard!</Text>
          <View className='flex flex-row items-center space-x-4 gap-4 mt-4'>
            <Image source={logo} className='rounded-full' style={{ width: 50, height: 50 }} resizeMode="cover" />
            <View>
                <Text className="text-white font-bold text-xl">{user?.email || 'User'}</Text>
                <Text className="text-white">{userDomain ? userDomain.toUpperCase() : 'Domain'}</Text>
            </View>
          </View>
        </View>
        <View>
            <Text className='text-white text-xl font-semibold mb-4'>Recently View</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                {videos.map((v, i) => (
                  <View key={v.id} className={`w-40 ${i === videos.length - 1 ? '' : 'mr-4'}`}>
                    <View className="bg-gray-800 rounded-xl overflow-hidden">
                      <Image source={{ uri: v.thumbnail }} className="w-full h-24" resizeMode="cover" />
                    </View>
                    <Text className="text-white mt-2 text-xs font-semibold" numberOfLines={2}>{v.title}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
