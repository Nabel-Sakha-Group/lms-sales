import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY_DQW,
  SUPABASE_ANON_KEY_NSG,
  SUPABASE_ANON_KEY_RMW,
  SUPABASE_URL,
  SUPABASE_URL_DQW,
  SUPABASE_URL_NSG,
  SUPABASE_URL_RMW,
} from '@env';

// Konfigurasi per domain (3 Supabase projects terpisah)
interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const SUPABASE_CONFIGS: Record<string, SupabaseConfig> = {
  nsg: {
    url: SUPABASE_URL_NSG || SUPABASE_URL || '',
    anonKey: SUPABASE_ANON_KEY_NSG || SUPABASE_ANON_KEY || '',
  },
  rmw: {
    url: SUPABASE_URL_RMW || SUPABASE_URL_NSG || SUPABASE_URL || '',
    anonKey: SUPABASE_ANON_KEY_RMW || SUPABASE_ANON_KEY_NSG || SUPABASE_ANON_KEY || '',
  },
  dqw: {
    url: SUPABASE_URL_DQW || SUPABASE_URL_NSG || SUPABASE_URL || '',
    anonKey: SUPABASE_ANON_KEY_DQW || SUPABASE_ANON_KEY_NSG || SUPABASE_ANON_KEY || '',
  },
  admin: {
    url: SUPABASE_URL_NSG || SUPABASE_URL || '',
    anonKey: SUPABASE_ANON_KEY_NSG || SUPABASE_ANON_KEY || '',
  },
};

// Validasi minimal
const defaultConfig = SUPABASE_CONFIGS.nsg;
if (!defaultConfig.url || !defaultConfig.anonKey) {
  throw new Error('Missing SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
}

// Create client instances untuk setiap domain
const supabaseClients: Record<string, SupabaseClient> = {};

const createSupabaseClientForDomain = (domain: string = 'nsg'): SupabaseClient => {
  if (supabaseClients[domain]) {
    return supabaseClients[domain];
  }

  const config = SUPABASE_CONFIGS[domain] || SUPABASE_CONFIGS.nsg;
  
  if (!config.url || !config.anonKey) {
    console.warn(`⚠️ Supabase config missing for domain "${domain}", falling back to NSG`);
    return supabaseClients['nsg'] || createSupabaseClientForConfig(SUPABASE_CONFIGS.nsg, 'nsg');
  }

  return createSupabaseClientForConfig(config, domain);
};

const normalizeSupabaseUrl = (url: string): string | null => {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  // If env is like "xyz.supabase.co" (no scheme), assume https.
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
};

const createSupabaseClientForConfig = (config: SupabaseConfig, domain: string): SupabaseClient => {
  const normalizedUrl = normalizeSupabaseUrl(config.url);
  if (!normalizedUrl) {
    if (domain !== 'nsg') {
      console.warn(
        `⚠️ Invalid SUPABASE_URL for domain "${domain}" (value: "${String(config.url)}"). Falling back to NSG.`
      );
      return supabaseClients['nsg'] || createSupabaseClientForConfig(SUPABASE_CONFIGS.nsg, 'nsg');
    }
    throw new Error(`Invalid supabaseUrl for domain "${domain}": Must be a valid HTTP or HTTPS URL.`);
  }
  
  const client = createClient(normalizedUrl, config.anonKey, {
    auth: { persistSession: true, detectSessionInUrl: false },
  });
  supabaseClients[domain] = client;
  return client;
};

// Default client (NSG)
const supabase: SupabaseClient = createSupabaseClientForDomain('nsg');

export { createSupabaseClientForDomain };
export default supabase;
