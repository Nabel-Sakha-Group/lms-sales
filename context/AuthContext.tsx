import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase, { createSupabaseClientForDomain } from 'lib/supabase';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = any;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isOffline: boolean;
  enterOffline: () => Promise<void>;
  exitOffline: () => Promise<void>;
  isAdmin: boolean;
  userRole: 'admin' | 'user' | null; // Role dari metadata
  userDomain: string | null; // Domain of the logged-in user (nsg, rmw, dqw, or admin)
  supabaseClient: any; // Domain-specific Supabase client
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Domain aliases used across auth logic
const NSG_ALIASES = ['@nsg.com', '@nabelsakha.com'];
const RMW_ALIASES = ['@rmw.com', '@rafitama.com'];
const DQW_ALIASES = ['@dqw.com', '@dimensiwahyudi.com'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const EXP_KEY = 'auth.expiresAt';
  const USER_KEY = 'auth.user';
  const SRC_KEY = 'auth.source'; // 'supabase' | 'custom'
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const persistAuth = async (u: any, source: 'supabase' | 'custom') => {
    const expiresAt = Date.now() + ONE_WEEK_MS;
    await AsyncStorage.multiSet([
      [EXP_KEY, String(expiresAt)],
      [USER_KEY, JSON.stringify(u ?? null)],
      [SRC_KEY, source],
    ]);
  };

  const clearPersistedAuth = async () => {
    await AsyncStorage.multiRemove([EXP_KEY, USER_KEY, SRC_KEY]);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        // Do NOT persist offline mode across app restarts.
        // Always start with isOffline = false so Login is shown first.
        if (mounted) setIsOffline(false);

        // Enforce 7-day expiry if present
        const expStr = await AsyncStorage.getItem(EXP_KEY);
        const now = Date.now();
        if (expStr) {
          const exp = parseInt(expStr, 10);
          if (Number.isFinite(exp) && now > exp) {
            await clearPersistedAuth();
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }
        }

        // Try Supabase session first
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('getSession error', error.message || error);
        }
        if (data.session?.user) {
          if (mounted) {
            setUser(data.session.user);
            setLoading(false);
          }
          return;
        }

        // Fallback to custom stored user if within expiry
        const src = await AsyncStorage.getItem(SRC_KEY);
        if (src === 'custom') {
          const stored = await AsyncStorage.getItem(USER_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (mounted) {
                setUser(parsed);
                setLoading(false);
              }
              return;
            } catch {}
          }
        }

        if (mounted) setLoading(false);
      } catch (e) {
        console.warn('Bootstrap auth error', e);
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        // If we have an expiry and it's passed, sign out immediately
        const expStr = await AsyncStorage.getItem(EXP_KEY);
        const exp = expStr ? parseInt(expStr, 10) : undefined;
        if (exp && Date.now() > exp) {
          await clearPersistedAuth();
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
        console.log('Auth state changed, user:', session?.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      (data as any)?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // If currently offline mode, prevent sign-in
    if (isOffline) {
      return { error: { message: 'Currently in Offline Mode' } };
    }
    // Try Supabase Auth first (untuk user yang dibuat via create_admin.js)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      setUser(data.user);
      await persistAuth(data.user, 'supabase');
      console.log('✅ Login berhasil via Supabase Auth:', data.user.email);
      console.log('🔍 User metadata:', data.user.user_metadata);
      const _email = email.toLowerCase();
      console.log(
        '🔍 Is admin?:',
        data.user.user_metadata?.role === 'admin' || NSG_ALIASES.some(d => _email.endsWith(d))
      );
      return { error: null };
    }

    // Fallback: Check 'users' table untuk non-admin users
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError || !userData) {
      // If user not found in custom users table, allow domain-based fallback
      const emailLower = email.toLowerCase();

      // If email belongs to NSG aliases, treat as admin
      if (NSG_ALIASES.some(d => emailLower.endsWith(d))) {
        const mockUser = {
          id: `domain-nsg-${emailLower}`,
          email: emailLower,
          created_at: new Date().toISOString(),
          user_metadata: { role: 'admin' },
        };
        setUser(mockUser as any);
        await persistAuth(mockUser, 'custom');
        console.log('✅ Login fallback via domain (NSG):', mockUser.email);
        return { error: null };
      }

      // If email belongs to RMW aliases, treat as regular user
      if (RMW_ALIASES.some(d => emailLower.endsWith(d))) {
        const mockUser = {
          id: `domain-rmw-${emailLower}`,
          email: emailLower,
          created_at: new Date().toISOString(),
          user_metadata: { role: 'user' },
        };
        setUser(mockUser as any);
        await persistAuth(mockUser, 'custom');
        console.log('✅ Login fallback via domain (RMW):', mockUser.email);
        return { error: null };
      }

      // If email belongs to DQW aliases, treat as regular user
      if (DQW_ALIASES.some(d => emailLower.endsWith(d))) {
        const mockUser = {
          id: `domain-dqw-${emailLower}`,
          email: emailLower,
          created_at: new Date().toISOString(),
          user_metadata: { role: 'user' },
        };
        setUser(mockUser as any);
        await persistAuth(mockUser, 'custom');
        console.log('✅ Login fallback via domain (DQW):', mockUser.email);
        return { error: null };
      }

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
    await persistAuth(mockUser, 'custom');
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
    await clearPersistedAuth();
  };

  const enterOffline = async () => {
    setIsOffline(true);
  };

  const exitOffline = async () => {
    setIsOffline(false);
  };

  // Get user role from metadata or domain aliases
  const getUserRole = (): 'admin' | 'user' | null => {
    if (!user) return null;

    const metadataRole = user.user_metadata?.role;
    if (metadataRole === 'admin' || metadataRole === 'user') return metadataRole;

    const email = user.email?.toLowerCase();
    if (email && NSG_ALIASES.some(d => email.endsWith(d))) return 'admin';
    if (email && (RMW_ALIASES.some(d => email.endsWith(d)) || DQW_ALIASES.some(d => email.endsWith(d)))) return 'user';

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

    if (isAdminUser()) return 'admin';

    if (NSG_ALIASES.some(d => email.endsWith(d))) return 'nsg';
    if (RMW_ALIASES.some(d => email.endsWith(d))) return 'rmw';
    if (DQW_ALIASES.some(d => email.endsWith(d))) return 'dqw';
    return null;
  };

  // debug log
  console.log('🔍 [AuthContext] Current user:', user?.email ?? null);
  console.log('🔍 [AuthContext] User role:', getUserRole());
  console.log('🔍 [AuthContext] Is admin?:', isAdminUser());
  console.log('🔍 [AuthContext] User domain:', getUserDomain());
  console.log('🔍 [AuthContext] Offline mode:', isOffline);

  // Get domain-specific Supabase client
  const currentDomain = getUserDomain() || 'nsg';
  const supabaseClient = createSupabaseClientForDomain(currentDomain);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isOffline,
        enterOffline,
        exitOffline,
        isAdmin: isAdminUser(),
        userRole: getUserRole(),
        userDomain: getUserDomain(),
        supabaseClient,
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
