import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import sharepointService, { SharePointFile } from '../services/sharepoint.service';
import authService from '../services/auth.service';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [videos, setVideos] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Uncomment untuk load dari SharePoint
    // loadVideosFromSharePoint();
  }, []);

  const loadVideosFromSharePoint = async () => {
    try {
      setLoading(true);
      
      // Login jika belum
      if (!authService.isAuthenticated()) {
        const { accessToken } = await authService.login();
        sharepointService.setAccessToken(accessToken);
      }
      
      // Ambil videos dari SharePoint
      const data = await sharepointService.getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos from SharePoint:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeContent />;
      case 'favorites':
        return <FavoritesContent />;
      case 'categories':
        return <CategoriesContent />;
      case 'search':
        return <SearchContent />;
      default:
        return <HomeContent />;
    }
  };

  return (
    <View className='flex-1 bg-gray-50'>
      {/* Fixed Header */}
      <View className='bg-blue-600 px-6 pt-12 pb-6'>
        <Text className='text-white text-2xl font-bold'>
          {activeTab === 'home' ? 'Dashboard' : activeTab === 'favorites' ? 'Favorites' : activeTab === 'categories' ? 'Categories' : 'Search'}
        </Text>
        <Text className='text-blue-100 text-sm mt-1'>
          {activeTab === 'home' ? 'Welcome to LMS Sales' : activeTab === 'favorites' ? 'Your favorite courses' : activeTab === 'categories' ? 'Browse by category' : 'Find courses'}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView className='flex-1'>
        {renderContent()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View className='bg-white border-t border-gray-200 flex-row justify-around py-3'>
        <TouchableOpacity
          className='items-center flex-1'
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'home' ? '#2563eb' : '#9ca3af'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'home' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className='items-center flex-1'
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons 
            name={activeTab === 'favorites' ? 'heart' : 'heart-outline'} 
            size={24} 
            color={activeTab === 'favorites' ? '#2563eb' : '#9ca3af'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'favorites' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className='items-center flex-1'
          onPress={() => setActiveTab('categories')}
        >
          <Ionicons 
            name={activeTab === 'categories' ? 'grid' : 'grid-outline'} 
            size={24} 
            color={activeTab === 'categories' ? '#2563eb' : '#9ca3af'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'categories' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className='items-center flex-1'
          onPress={() => setActiveTab('search')}
        >
          <Ionicons 
            name={activeTab === 'search' ? 'search' : 'search-outline'} 
            size={24} 
            color={activeTab === 'search' ? '#2563eb' : '#9ca3af'} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'search' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            Search
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Home Content Component
function HomeContent() {
  return (
    <View className='w-full px-6 py-6'>
      {[...Array(5)].map((_, index) => (
        <View key={index} className='bg-white rounded-lg shadow-md p-6 mb-4'>
          <View className='bg-gray-500 p-16 rounded-lg'>
          </View>
          <Text className='font-semibold text-xl mt-2'>Video {index + 1}</Text>
        </View>
      ))}
    </View>
  );
}

// Materi Content Component
function FavoritesContent() {
  return (
    <View className='w-full px-6 py-6'>
      <View className='space-y-3 gap-4'>
        <TouchableOpacity className='bg-white rounded-lg p-4 shadow'>
          <Text className='text-gray-800 font-bold text-base mb-2'>
            Introduction to Sales
          </Text>
          <Text className='text-gray-500 text-sm mb-2'>
            Learn the basics of sales and customer engagement
          </Text>
          <Text className='text-blue-600 text-xs font-semibold'>
            12 Lessons • 2h 30m
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-4 shadow'>
          <Text className='text-gray-800 font-bold text-base mb-2'>
            Advanced Sales Techniques
          </Text>
          <Text className='text-gray-500 text-sm mb-2'>
            Master advanced strategies for closing deals
          </Text>
          <Text className='text-blue-600 text-xs font-semibold'>
            8 Lessons • 1h 45m
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-4 shadow'>
          <Text className='text-gray-800 font-bold text-base mb-2'>
            Customer Relations
          </Text>
          <Text className='text-gray-500 text-sm mb-2'>
            Build lasting relationships with customers
          </Text>
          <Text className='text-blue-600 text-xs font-semibold'>
            10 Lessons • 2h 15m
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Profile Content Component
function CategoriesContent() {
  return (
    <View className='w-full px-6 py-6'>
      <View className='flex-row flex-wrap justify-between'>
        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="code-slash" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Programming</Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="briefcase" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Business</Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="color-palette" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Design</Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="analytics" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Marketing</Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="musical-notes" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Music</Text>
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-6 mb-4 w-[48%] shadow items-center'>
          <Ionicons name="camera" size={32} color="#2563eb" />
          <Text className='text-gray-800 font-semibold text-base mt-3'>Photography</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Search Content Component
function SearchContent() {
  return (
    <View className='w-full px-6 py-6'>
      {/* Search Bar */}
      <View className='bg-white rounded-lg p-4 flex-row items-center shadow mb-6'>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <Text className='ml-3 text-gray-400'>Search courses...</Text>
      </View>

      {/* Popular Searches */}
      <Text className='text-gray-800 font-bold text-lg mb-4'>Popular Searches</Text>
      <View className='flex-row flex-wrap gap-2'>
        <TouchableOpacity className='bg-blue-50 rounded-full px-4 py-2'>
          <Text className='text-blue-600 text-sm'>React Native</Text>
        </TouchableOpacity>
        <TouchableOpacity className='bg-blue-50 rounded-full px-4 py-2'>
          <Text className='text-blue-600 text-sm'>JavaScript</Text>
        </TouchableOpacity>
        <TouchableOpacity className='bg-blue-50 rounded-full px-4 py-2'>
          <Text className='text-blue-600 text-sm'>UI/UX Design</Text>
        </TouchableOpacity>
        <TouchableOpacity className='bg-blue-50 rounded-full px-4 py-2'>
          <Text className='text-blue-600 text-sm'>Python</Text>
        </TouchableOpacity>
        <TouchableOpacity className='bg-blue-50 rounded-full px-4 py-2'>
          <Text className='text-blue-600 text-sm'>Marketing</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Searches */}
      <Text className='text-gray-800 font-bold text-lg mt-6 mb-4'>Recent Searches</Text>
      <View className='space-y-3 gap-3'>
        <TouchableOpacity className='bg-white rounded-lg p-4 flex-row items-center justify-between shadow'>
          <View className='flex-row items-center'>
            <Ionicons name="time-outline" size={20} color="#9ca3af" />
            <Text className='ml-3 text-gray-700'>Sales Techniques</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity className='bg-white rounded-lg p-4 flex-row items-center justify-between shadow'>
          <View className='flex-row items-center'>
            <Ionicons name="time-outline" size={20} color="#9ca3af" />
            <Text className='ml-3 text-gray-700'>Customer Service</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
