// utils/backfillStageDates.js

import { supabase } from '../lib/supabase';

/**
 * Przejrzy wszystkie rekordy w tabeli 'etapy', których
 * kolumna 'date' jest null, obliczy 'date' := liqueur.created_at + execute_after_days,
 * a następnie zaktualizuje te wpisy w bazie.
 *
 * Uwaga: Funkcję możesz wywołać jednokrotnie (np. przy starcie aplikacji),
 * a następnie wyłączyć, żeby nie nadpisywała już uzupełnionych dat.
 */
export async function backfillStageDates() {
  // 1) Pobierz wszystkie etapy, gdzie date IS NULL
  const { data: stagesNull, error: stagesError } = await supabase
    .from('etapy')
    .select('id, nalewka_id, execute_after_days')
    .is('date', null);

  if (stagesError) {
    console.error('Błąd pobierania etapów do backfillu:', stagesError.message);
    return;
  }

  if (!stagesNull || stagesNull.length === 0) {
    console.log('Brak etapów z pustą kolumną date – nic do uzupełnienia.');
    return;
  }

  // 2) Pobrać odpowiadające nalewki, żeby mieć ich created_at
  //    Zbierzmy unikalne liqueur_id z etapieNull
  const uniqueLiqueurIds = [...new Set(stagesNull.map((e) => e.nalewka_id))];

  const { data: liqueursData, error: liqueursError } = await supabase
    .from('nalewki')
    .select('id, created_at')
    .in('id', uniqueLiqueurIds);

  if (liqueursError) {
    console.error('Błąd pobierania nalewek do backfillu:', liqueursError.message);
    return;
  }

  // Stwórz mapę: liqueur_id -> data utworzenia (Date)
  const createdMap = {};
  (liqueursData || []).forEach((l) => {
    createdMap[l.id] = new Date(l.created_at);
  });

  // 3) Dla każdego etapu z NULL w date: oblicz newDate = created_at + execute_after_days
  //    i zrób update
  for (const stage of stagesNull) {
    const parentCreated = createdMap[stage.nalewka_id];
    if (!parentCreated) {
      console.warn(
        `Nie znaleziono nalewki o id=${stage.nalewka_id} (etap id=${stage.id}) – pomijam.`
      );
      continue;
    }

    // Oblicz faktyczną datę wykonania:
    const newDate = new Date(parentCreated);
    newDate.setDate(newDate.getDate() + (stage.execute_after_days || 0));
    // Ustaw godzinę na północ, aby kolumna date była „bez czasu”
    newDate.setHours(0, 0, 0, 0);

    const isoDate = newDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Aktualizuj w bazie
    const { error: updateError } = await supabase
      .from('etapy')
      .update({ date: isoDate })
      .eq('id', stage.id);

    if (updateError) {
      console.error(`Błąd aktualizacji etapu id=${stage.id}:`, updateError.message);
    } else {
      console.log(`Uzupełniono etap id=${stage.id} → date = ${isoDate}`);
    }
  }

  console.log('Backfill etapy zakończony.');
}
