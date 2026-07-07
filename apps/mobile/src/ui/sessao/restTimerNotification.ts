import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Com o app em foreground o banner in-app já cobre o aviso — a notificação
// só deve aparecer quando o descanso termina em background/tela bloqueada.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const CHANNEL_ID = 'rest-timer';
let channelReady = false;
let permissionDenied = false;

async function ensureReady(): Promise<boolean> {
  if (permissionDenied) return false;
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) {
    // Sem permissão o timer in-app continua funcionando; não insistir.
    permissionDenied = true;
    return false;
  }
  if (Platform.OS === 'android' && !channelReady) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timer de descanso',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 100, 400],
      sound: 'default',
    });
    channelReady = true;
  }
  return true;
}

/**
 * Agenda a notificação de fim de descanso para daqui a `seconds` segundos.
 * Retorna o id agendado (para cancelar em skip/novo descanso) ou null se o
 * usuário negou permissão.
 */
export async function scheduleRestEndNotification(
  title: string,
  body: string,
  seconds: number,
): Promise<string | null> {
  try {
    if (seconds < 1 || !(await ensureReady())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', vibrate: [0, 400, 100, 400] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null; // notificação é acessória — nunca derruba o fluxo do treino
  }
}

export async function cancelRestEndNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // já disparada/cancelada — nada a fazer
  }
}
