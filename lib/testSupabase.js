import { supabase } from './supabase.js'; // popraw ścieżkę jeśli trzeba

async function testSupabase() {
  // Przykład: pobierz 1 wiersz z tabeli 'users' (lub innej istniejącej tabeli w Twojej bazie)
  const { data, error } = await supabase.from('users').select('*').limit(1);

  if (error) {
    console.error('Błąd połączenia z Supabase:', error.message);
  } else {
    console.log('Test połączenia OK, dane:', data);
  }
}

testSupabase();
