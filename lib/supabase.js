

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hhuxveoofzyrwtxfmvnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodXh2ZW9vZnp5cnd0eGZtdm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODcxMDMsImV4cCI6MjA2NDI2MzEwM30.ykWrXvtylfgpag12f7es4mRtTY_JIIR59y_OePElBso'; // skrócony dla czytelności


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
