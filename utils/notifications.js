import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase'; // ścieżkę dopasuj do siebie

export const planStageNotifications = async (stages, startDate, userId, notificationHour = '15:00') => {
  if (!stages || stages.length === 0) {
    console.log('Brak etapów do zaplanowania.');
    return;
  }

  const [hourStr = '15', minuteStr = '0'] = notificationHour.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  await Promise.all(
    stages.map(async (stage) => {
      const stageDate = new Date(startDate);
      stageDate.setDate(stageDate.getDate() + (stage.execute_after_days || 0));
      stageDate.setHours(hour, minute, 0, 0);

      if (stageDate.getTime() < Date.now()) return;

      if (stage.notification_id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(stage.notification_id);
        } catch (e) {
          console.warn('Nie można anulować powiadomienia', stage.notification_id, e);
        }
      }

      const newNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Przypomnienie',
          body: `Etap "${stage.note}" zaplanowany na ${stageDate.toLocaleDateString('pl-PL')}`,
          data: { stageId: stage.id },
        },
        trigger: { date: stageDate },
      });

      await supabase
        .from('etapy')
        .update({ notification_id: newNotificationId })
        .eq('id', stage.id);
    })
  );
};

export async function updateAllUserNotifications(userId, notificationHour) {
  // 1. Pobierz nalewki użytkownika (np. status active)
  const { data: liqueurs, error: liqueursError } = await supabase
    .from('nalewki')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (liqueursError) {
    throw new Error('Błąd pobierania nalewek: ' + liqueursError.message);
  }
  if (!liqueurs || liqueurs.length === 0) {
    console.log('Brak aktywnych nalewek dla użytkownika');
    return;
  }
  console.log('Funckja')
  // Rozdziel godzinę i minuty z notificationHour, np. '17:00'
  const [hourStr = '15', minuteStr = '0'] = notificationHour.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // 2. Dla każdej nalewki pobierz etapy i aktualizuj powiadomienia
  for (const liqueur of liqueurs) {
    const { data: stages, error: stagesError } = await supabase
      .from('etapy')
      .select('*')
      .eq('nalewka_id', liqueur.id);

    if (stagesError) {
      console.warn(`Błąd pobierania etapów nalewki ${liqueur.id}:`, stagesError.message);
      continue;
    }
    if (!stages || stages.length === 0) {
      continue; // brak etapów, pomijamy
    }

    for (const stage of stages) {
      try {
        // anuluj stare powiadomienie jeśli jest
        if (stage.notification_id) {
          await Notifications.cancelScheduledNotificationAsync(stage.notification_id);
        }

        // oblicz datę powiadomienia
        const stageDate = new Date(liqueur.created_at);
        stageDate.setDate(stageDate.getDate() + (stage.execute_after_days || 0));
        stageDate.setHours(hour, minute, 0, 0);

        // jeśli data jest w przeszłości — pomijamy
        if (stageDate.getTime() < Date.now()) continue;

        // zaplanuj nowe powiadomienie
        const newNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Przypomnienie',
            body: `Etap "${stage.note}" zaplanowany na ${stageDate.toLocaleDateString('pl-PL')}`,
            data: { stageId: stage.id },
          },
          trigger: { date: stageDate },
        });

        // zapisz nowe notification_id w bazie
        await supabase
          .from('etapy')
          .update({ notification_id: newNotificationId })
          .eq('id', stage.id);

      } catch (e) {
        console.warn(`Błąd aktualizacji powiadomienia etapu ${stage.id}:`, e);
      }
    }
  }
}

