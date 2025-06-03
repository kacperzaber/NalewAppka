import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hhuxveoofzyrwtxfmvnr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodXh2ZW9vZnp5cnd0eGZtdm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODcxMDMsImV4cCI6MjA2NDI2MzEwM30.ykWrXvtylfgpag12f7es4mRtTY_JIIR59y_OePElBso' 
);

(async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'kacperz787@gmail.com',
    password: 'admin',
  });

  console.log({ data, error });
})();
