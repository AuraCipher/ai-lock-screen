// Re-export from the auto-generated client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wmvafvyawpngrcmqnsmd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdmFmdnlhd3BuZ3JjbXFuc21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzE0NzgsImV4cCI6MjA4NDQwNzQ3OH0.mUhNKCxCse4sbRDPmj_ATOnrDGZTmwVXGI_cNgS5suo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
