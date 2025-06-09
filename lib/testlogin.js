import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hhuxveoofzyrwtxfmvnr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodXh2ZW9vZnp5cnd0eGZtdm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODcxMDMsImV4cCI6MjA2NDI2MzEwM30.ykWrXvtylfgpag12f7es4mRtTY_JIIR59y_OePElBso'
);

(async () => {
  // Logowanie
  const { data: { user, session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'mateusz.brodzinski@gmail.com',
    password: 'hasloMateusz123',
  });

  if (loginError) {
    console.error('Błąd logowania:', loginError.message);
    return;
  }

  console.log('Zalogowany użytkownik:', user);

  // Zmiana hasła (wymaga zalogowanego użytkownika)
  const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
    password: 'noweHasloMateusz123',  // wpisz nowe hasło tutaj
  });

  if (updateError) {
    console.error('Błąd zmiany hasła:', updateError.message);
  } else {
    console.log('Hasło zostało zmienione', updatedUser);
  }
})();
