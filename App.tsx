import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import './global.css';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ListScreen from './screens/ListScreen';
import DownloadScreen from './screens/DownloadScreen';
import AdminScreen from './screens/AdminScreen';

export type RootStackParamList = {
  Login: undefined;
  AppDrawer: undefined;
};

export type DrawerParamList = {
  Home: undefined;
  List: undefined;
  Download: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const DarkTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0f172a',
    card: '#1f2937',
    text: '#ffffff',
    border: '#334155',
    primary: '#3b82f6',
  },
};

import { AuthProvider, useAuth } from 'context/AuthContext';

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      {/* You can replace this with a splash/loading screen */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-white">Loading...</Text>
      </View>
    </NavigationContainer>
  );

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={user ? 'AppDrawer' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: '#1f2937' },
          headerTitleStyle: { color: '#fff' },
          headerTintColor: '#fff',
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="AppDrawer" component={AppDrawer} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function CustomDrawerContent(props: any) {
  const { isAdmin, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    // Auth state change will automatically navigate to Login screen
    // No need to manually reset navigation
  };

  // Filter routes so Admin item only visible to admin
  const routes = props.state.routes.filter((r: any) => {
    if (r.name === 'Admin' && !isAdmin) return false;
    return true;
  });

  const filteredState = { ...props.state, routes };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, paddingTop: 0 }}>
      <View className="px-4 py-5 ">
        <Text className='text-white text-xl font-semibold mt-4'>Menu</Text>
      </View>
      <View className="h-px bg-slate-700" />
      <View className="flex-1 mt-2">
        <DrawerItemList {...props} state={filteredState} />
      </View>
      <View className="mt-auto border-t border-slate-700">
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 my-3 px-4 py-3 bg-red-600 rounded-lg active:bg-red-700"
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text className="text-white text-center font-medium">Log Out</Text>
        </TouchableOpacity>
        <View className="px-4 pb-3">
          <Text className="text-xs text-slate-400">© 2025 YourApp</Text>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

function AppDrawer() {
  const { isAdmin } = useAuth();
  return (
    <Drawer.Navigator
      initialRouteName={isAdmin ? 'Admin' : 'Home'}
      screenOptions={{
        headerStyle: { backgroundColor: '#1f2937' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
        drawerStyle: { backgroundColor: '#0f172a' },
        drawerActiveBackgroundColor: '#1f2937',
        drawerActiveTintColor: '#3b82f6',
        drawerInactiveTintColor: '#cbd5e1',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="List" component={ListScreen} options={{ title: 'Categories' }} />
      <Drawer.Screen name="Download" component={DownloadScreen} options={{ title: 'Downloads' }} />
      <Drawer.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
    </Drawer.Navigator>
  );
}
