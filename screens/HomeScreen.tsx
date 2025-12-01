import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useAuth } from 'context/AuthContext';
import { useResponsive, getResponsiveStyle } from 'hooks/useResponsive';

// Logo mapping for each domain using local assets
const DOMAIN_LOGOS = {
  nsg: require('../assets/Nabel.png'),
  rmw: require('../assets/RMW.webp'),
  dqw: require('../assets/DQW.png'),
  admin: require('../assets/icon.png'), // Use app icon for admin
};

export default function HomeScreen() {
  const { user, userDomain, isAdmin } = useAuth();
  const { isTablet, isLandscape } = useResponsive();
  const responsiveStyle = getResponsiveStyle(isTablet, isLandscape);
  
  // Get logo based on user domain
  const logo = userDomain ? DOMAIN_LOGOS[userDomain as keyof typeof DOMAIN_LOGOS] : require('../assets/icon.png');

  // Get role badge color
  const getRoleBadge = () => {
    if (isAdmin) {
      return { text: 'ADMIN', bg: 'bg-red-600', icon: '🔐' };
    }
    return { text: 'USER', bg: 'bg-blue-600', icon: '👤' };
  };

  const roleBadge = getRoleBadge();

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
      <View style={[responsiveStyle.container, { minHeight: '100%' }]}>
        <View className='bg-gray-800 rounded-xl mb-4' style={{ padding: isTablet ? 24 : 16 }}>
          <Text 
            className='text-white' 
            style={{ fontSize: responsiveStyle.text.body, marginBottom: 16 }}
          >
            Selamat datang di Dashboard!
          </Text>
          <View className='flex flex-row items-center gap-4'>
            <Image 
              source={logo} 
              className='rounded-full' 
              style={{ 
                width: isTablet ? 60 : 50, 
                height: isTablet ? 60 : 50 
              }} 
              resizeMode="cover" 
            />
            <View className="flex-1">
                <Text 
                  className="text-white font-bold" 
                  style={{ fontSize: responsiveStyle.text.heading }}
                >
                  {user?.email || 'User'}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text 
                    className="text-gray-400" 
                    style={{ fontSize: responsiveStyle.text.body }}
                  >
                    {userDomain ? userDomain.toUpperCase() : 'Domain'}
                  </Text>
                  <View className={`${roleBadge.bg} px-2 py-1 rounded`}>
                    <Text 
                      className="text-white font-bold" 
                      style={{ fontSize: responsiveStyle.text.caption }}
                    >
                      {roleBadge.icon} {roleBadge.text}
                    </Text>
                  </View>
                </View>
            </View>
          </View>
        </View>
        
        <View>
            <Text 
              className='text-white font-semibold' 
              style={{ 
                fontSize: responsiveStyle.text.subheading, 
                marginBottom: isTablet ? 20 : 16 
              }}
            >
              Recently View
            </Text>
            
            {isTablet && isLandscape ? (
              // Grid layout for tablet landscape
              <View className="flex-row flex-wrap justify-between">
                {videos.map((v) => (
                  <View key={v.id} style={{ width: '23%', marginBottom: 16 }}>
                    <View className="bg-gray-800 rounded-xl overflow-hidden">
                      <Image 
                        source={{ uri: v.thumbnail }} 
                        style={{ width: '100%', height: 120 }} 
                        resizeMode="cover" 
                      />
                    </View>
                    <Text 
                      className="text-white mt-2 font-semibold" 
                      style={{ fontSize: responsiveStyle.text.caption }}
                      numberOfLines={2}
                    >
                      {v.title}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              // Horizontal scroll for mobile/portrait
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {videos.map((v, i) => (
                    <View 
                      key={v.id} 
                      style={{ 
                        width: isTablet ? 200 : 160, 
                        marginRight: i === videos.length - 1 ? 0 : 16 
                      }}
                    >
                      <View className="bg-gray-800 rounded-xl overflow-hidden">
                        <Image 
                          source={{ uri: v.thumbnail }} 
                          style={{ 
                            width: '100%', 
                            height: isTablet ? 100 : 80 
                          }} 
                          resizeMode="cover" 
                        />
                      </View>
                      <Text 
                        className="text-white mt-2 font-semibold" 
                        style={{ fontSize: responsiveStyle.text.caption }}
                        numberOfLines={2}
                      >
                        {v.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
        </View>
      </View>
    </ScrollView>
  );
}
