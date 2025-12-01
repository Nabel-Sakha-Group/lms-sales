import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from 'lib/supabase';
import * as Crypto from 'expo-crypto';

type User = any;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  userRole: 'admin' | 'user' | null; // Role dari metadata
  userDomain: string | null; // Domain of the logged-in user (nsg, rmw, dqw, or admin)
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('getSession error', error.message || error);
      }
      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    };

    getSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        console.log('Auth state changed, user:', session?.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      // data.subscription is the removal handle (typing depends on supabase client version)
      (data as any)?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Try Supabase Auth first (untuk user yang dibuat via create_admin.js)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      setUser(data.user);
      console.log('✅ Login berhasil via Supabase Auth:', data.user.email);
      console.log('🔍 User metadata:', data.user.user_metadata);
      console.log('🔍 Is admin?:', data.user.user_metadata?.role === 'admin' || email.endsWith('@nsg.com'));
      return { error: null };
    }

    // Fallback: Check 'users' table untuk non-admin users
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError || !userData) {
      return { error: { message: 'Invalid email or password' } };
    }

    // Compare password with hash
    const hashedInputPassword = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + email.toLowerCase()
    );
    
    if (hashedInputPassword !== userData.password_hash) {
      return { error: { message: 'Invalid email or password' } };
    }

    // Create a mock user object for non-admin users
    const mockUser = {
      id: userData.id,
      email: userData.email,
      created_at: userData.created_at,
      user_metadata: { role: 'user' }, // Mark as regular user
    };

    setUser(mockUser as any);
    console.log('✅ Login berhasil via custom table:', mockUser.email);
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    // Use signUp for initial admin registration. Supabase will send confirmation depending on settings.
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error) setUser(data.user ?? null);
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Get user role from metadata
  const getUserRole = (): 'admin' | 'user' | null => {
    if (!user) return null;
    
    // Check metadata role explicitly
    const metadataRole = user.user_metadata?.role;
    if (metadataRole === 'admin' || metadataRole === 'user') {
      return metadataRole;
    }
    
    // Fallback: Check domain @nsg.com = admin
    if (user.email?.endsWith('@nsg.com')) return 'admin';
    
    // Default to user if logged in but no explicit role
    return 'user';
  };

  // Check if user is admin based on role
  const isAdminUser = (): boolean => {
    return getUserRole() === 'admin';
  };

  // Extract domain from user email
  const getUserDomain = (): string | null => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    
    // Check if admin
    if (isAdminUser()) return 'admin';
    
    if (email.endsWith('@nsg.com')) return 'nsg';
    if (email.endsWith('@rmw.com')) return 'rmw';
    if (email.endsWith('@dqw.com')) return 'dqw';
    return null;
  };

  // debug log
  console.log('🔍 [AuthContext] Current user:', user?.email ?? null);
  console.log('🔍 [AuthContext] User role:', getUserRole());
  console.log('🔍 [AuthContext] Is admin?:', isAdminUser());
  console.log('🔍 [AuthContext] User domain:', getUserDomain());

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin: isAdminUser(),
        userRole: getUserRole(),
        userDomain: getUserDomain(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
