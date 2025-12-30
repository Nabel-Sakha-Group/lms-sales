import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import './global.css';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useResponsive } from 'hooks/useResponsive';
import { useOrientationLock } from 'hooks/useOrientationLock';
import OrientationPrompt from 'components/OrientationPrompt';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ListScreen from './screens/ListScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import DownloadScreen from './screens/DownloadScreen';
import AdminScreen from './screens/AdminScreen';
import ClientFolderScreen from './screens/ClientFolderScreen';
import VideosScreen from './screens/VideosScreen';
import PermissionManager from './components/PermissionManager';
import { getBrandColors } from 'lib/theme';

export type RootStackParamList = {
  Login: undefined;
  AppDrawer: undefined;
  OfflineDrawer: undefined;
};

export type DrawerParamList = {
  Home: undefined;
  Videos: undefined;
  List: undefined;
  Favorites: undefined;
  Download: undefined;
  Admin: undefined;
  ClientFolder: { rootFolder: string; title?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const BaseAppTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
    text: '#111827',
    border: '#fed7aa', // light orange border
    primary: '#ef4444', // will be overridden per domain
  },
};

import { AuthProvider, useAuth } from 'context/AuthContext';

function RootNavigator() {
  const { user, loading, isOffline, userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);

  const AppTheme: Theme = {
    ...BaseAppTheme,
    colors: {
      ...BaseAppTheme.colors,
      primary: brandColors.primary,
    },
  };

  if (loading) return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      {/* You can replace this with a splash/loading screen */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-900">Loading...</Text>
      </View>
    </NavigationContainer>
  );

  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={isOffline ? 'OfflineDrawer' : user ? 'AppDrawer' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: '#ef4444' },
          headerTitleStyle: { color: '#ffffff' },
          headerTintColor: '#ffffff',
        }}
      >
        {isOffline ? (
          <Stack.Screen name="OfflineDrawer" component={OfflineOnlyApp} options={{ headerShown: false }} />
        ) : !user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="AppDrawer" component={AppWithOrientationPrompt} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionManager>
        <RootNavigator />
      </PermissionManager>
    </AuthProvider>
  );
}

function CustomDrawerContent(props: any) {
  const { isAdmin, signOut, userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);

  const handleLogout = async () => {
    await signOut();
    // Auth state change will automatically navigate to Login screen
    // No need to manually reset navigation
  };

  // Filter routes so Admin item only visible to admin
  const filteredRoutes = props.state.routes.filter((r: any) => {
    if (r.name === 'Admin' && !isAdmin) return false;
    if (r.name === 'ClientFolder') return false; // hide detail screen from drawer menu
    if (r.name === 'Videos') return false; // hide videos detail screen from drawer menu
    return true;
  });

  // Setelah filter, index aktif harus dipetakan ulang ke posisi route yang sama.
  // Kalau route aktif disembunyikan (mis. ClientFolder/Videos), fallback ke index 0.
  const activeRoute = props.state.routes[props.state.index];
  const mappedIndex = filteredRoutes.findIndex((r: any) => r.key === activeRoute?.key);
  const newIndex = mappedIndex >= 0 ? mappedIndex : 0;

  const filteredState = { ...props.state, routes: filteredRoutes, index: newIndex };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, paddingTop: 0 }}
      style={{ backgroundColor: '#ffffff' }}
    >
      <SafeAreaView style={{ backgroundColor: brandColors.primary }}>
        <View className="px-4 py-5">
          <Text className='text-white text-xl font-semibold mt-1'>Menu</Text>
        </View>
      </SafeAreaView>
      <View className="h-px bg-orange-200" />
      <View className="flex-1 mt-2">
        <DrawerItemList {...props} state={filteredState} />
      </View>
      <View className="mt-auto border-t border-orange-200 bg-white">
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 my-3 px-4 py-3 rounded-lg"
          style={{ backgroundColor: brandColors.primaryDark }}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text className="text-white text-center font-medium">Log Out</Text>
        </TouchableOpacity>
        <View className="px-4 pb-3">
          <Text className="text-xs text-gray-400">© 2025 YourApp</Text>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

function AppDrawer() {
  const { isAdmin, userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);
  const { isTablet, isLandscape } = useResponsive();
  
  // Lock orientation for tablets
  useOrientationLock();
  
  const drawerType = isTablet && isLandscape ? 'permanent' : 'front';
  const drawerWidth = isTablet && isLandscape ? 280 : 300;
  
  return (
    <Drawer.Navigator
      initialRouteName={isAdmin ? 'Admin' : 'Home'}
      screenOptions={{
        headerStyle: { backgroundColor: brandColors.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { color: '#ffffff' },
        drawerStyle: { 
          backgroundColor: '#ffffff',
          width: drawerWidth,
        },
        drawerType,
        drawerActiveBackgroundColor: brandColors.drawerActiveBg,
        drawerActiveTintColor: brandColors.drawerActiveTint,
        drawerInactiveTintColor: '#4b5563', // gray-600
        drawerItemStyle: {
          borderRadius: 9999,
          marginHorizontal: 4,
          marginVertical: 2,
        },
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: '500',
        },
        headerShown: !(isTablet && isLandscape), // Hide header on tablet landscape
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="Videos" component={VideosScreen} options={{ title: 'Videos' }} />
      <Drawer.Screen name="List" component={ListScreen} options={{ title: 'Categories' }} />
      <Drawer.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      <Drawer.Screen name="Download" component={DownloadScreen} options={{ title: 'Downloads' }} />
      <Drawer.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      <Drawer.Screen
        name="ClientFolder"
        component={ClientFolderScreen}
        options={({ route }) => ({
          // Gunakan title dari param jika ada, fallback ke default
          title: (route.params as any)?.title || 'Client Folder',
        })}
      />
    </Drawer.Navigator>
  );
}

function AppWithOrientationPrompt() {
  return (
    <>
      <AppDrawer />
      <OrientationPrompt />
    </>
  );
}

function OfflineOnlyApp() {
  const { isTablet, isLandscape } = useResponsive();
  const { exitOffline, userDomain } = useAuth();
  const brandColors = getBrandColors(userDomain);
  useOrientationLock();
  const drawerType = isTablet && isLandscape ? 'permanent' : 'front';
  const drawerWidth = isTablet && isLandscape ? 280 : 300;

  return (
    <Drawer.Navigator
      initialRouteName={'Download'}
      screenOptions={{
        headerStyle: { backgroundColor: brandColors.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { color: '#ffffff' },
        drawerStyle: {
          backgroundColor: '#ffffff',
          width: drawerWidth,
        },
        drawerType,
        drawerActiveBackgroundColor: brandColors.drawerActiveBg,
        drawerActiveTintColor: brandColors.drawerActiveTint,
        drawerInactiveTintColor: '#4b5563',
        headerShown: !(isTablet && isLandscape),
        drawerItemStyle: {
          borderRadius: 9999,
          marginHorizontal: 4,
          marginVertical: 2,
        },
        drawerLabelStyle: {
          fontSize: 15,
          fontWeight: '500',
        },
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={{ flex: 1, paddingTop: 0 }}
          style={{ backgroundColor: '#ffffff' }}
        >
          <SafeAreaView style={{ backgroundColor: brandColors.primary }}>
            <View className="px-4 py-5">
              <Text className='text-white text-xl font-semibold mt-1'>Menu (Offline)</Text>
            </View>
          </SafeAreaView>
          <View className="h-px bg-orange-200" />
          <View className="flex-1 mt-2">
            {/* Only show Download in offline */}
            <DrawerItemList
              {...props}
              state={{
                ...props.state,
                routes: props.state.routes.filter((r: any) => r.name === 'Download'),
                index: 0,
              }}
            />
          </View>
          <View className="mt-auto border-t border-orange-200 bg-white">
            <TouchableOpacity
              onPress={async () => {
                await exitOffline();
                // RootNavigator will switch to Login when isOffline becomes false
              }}
              className="mx-4 my-3 px-4 py-3 rounded-lg"
              style={{ backgroundColor: brandColors.primaryDark }}
              accessibilityRole="button"
              accessibilityLabel="Masuk Login"
            >
              <Text className="text-white text-center font-medium">Masuk Login</Text>
            </TouchableOpacity>
          </View>
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen name="Download" component={DownloadScreen} options={{ title: 'Downloads' }} />
    </Drawer.Navigator>
  );
}
