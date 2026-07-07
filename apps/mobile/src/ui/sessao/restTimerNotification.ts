import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Mesmo identifier para as duas: a de fim SUBSTITUI a fixa na barra.
const REST_ID = 'rest-timer';

// Handler por tipo: a notificação FIXA (kind rest-live) deve entrar na barra
// mesmo com o app em foreground (é o pedido do usuário — presença na barra),
// mas sem banner/som; a de FIM é suprimida em foreground (o banner in-app
// com vibração cobre) e só aparece quando o descanso termina em background.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const live = notification.request.content.data?.kind === 'rest-live';
    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: live,
    };
  },
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

export interface RestNotificationTexts {
  ongoingTitle: string;
  ongoingBody: string;
  doneTitle: string;
  doneBody: string;
}

/**
 * Publica a notificação FIXA (sticky) do descanso na barra imediatamente e
 * agenda a de conclusão para daqui a `seconds` — mesma id, então a de fim
 * substitui a fixa (com som/vibração do sistema, mesmo com o app fechado).
 */
export async function startRestNotification(texts: RestNotificationTexts, seconds: number): Promise<void> {
  try {
    if (seconds < 1 || !(await ensureReady())) return;

    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: {
        title: texts.ongoingTitle,
        body: texts.ongoingBody,
        sticky: true,
        autoDismiss: false,
        data: { kind: 'rest-live' },
      },
      trigger: null, // imediata
    });

    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: {
        title: texts.doneTitle,
        body: texts.doneBody,
        sound: 'default',
        vibrate: [0, 400, 100, 400],
        data: { kind: 'rest-end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // notificação é acessória — nunca derruba o fluxo do treino
  }
}

/** Remove a fixa da barra e cancela a de fim (skip / novo descanso / concluiu no app). */
export async function cancelRestNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ID);
  } catch { /* já disparada */ }
  try {
    await Notifications.dismissNotificationAsync(REST_ID);
  } catch { /* já dispensada */ }
}
