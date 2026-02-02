import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabaseConfig';

export const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
