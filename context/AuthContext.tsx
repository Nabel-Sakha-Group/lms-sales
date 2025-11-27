import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from 'lib/supabase';
import ADMIN_EMAIL from 'config/admin';
import * as Crypto from 'expo-crypto';

type User = any;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>; // initial admin registration
  signOut: () => Promise<void>;
  isAdmin: boolean;
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
        // debug log for auth changes
        // eslint-disable-next-line no-console
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
    // First check if it's admin (uses Supabase Auth)
    if (email === adminEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) setUser(data.user ?? null);
      return { error };
    }

    // For non-admin users, check 'users' table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError || !userData) {
      return { error: { message: 'Invalid email or password' } };
    }

    // Compare password with hash (using same algorithm as create: SHA256 with email as salt)
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
    };

    setUser(mockUser as any);
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

  // use value exported from config/admin
  const adminEmail = ADMIN_EMAIL || 'admin@example.com';

  // Extract domain from user email
  const getUserDomain = (): string | null => {
    if (!user?.email) return null;
    const email = user.email.toLowerCase();
    if (email.endsWith('@nsg.com')) return 'nsg';
    if (email.endsWith('@rmw.com')) return 'rmw';
    if (email.endsWith('@dqw.com')) return 'dqw';
    if (email === adminEmail) return 'admin';
    return null;
  };

  // debug log
  // eslint-disable-next-line no-console
  console.log('AuthContext init; current user:', user?.email ?? null, 'adminEmail:', adminEmail);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin: Boolean(user?.email && user.email === adminEmail),
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
