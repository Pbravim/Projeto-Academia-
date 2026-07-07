import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificação do timer de descanso — DOIS backends atrás da mesma API:
 *
 * 1. Notifee (build standalone/dev client): notificação fixa com CRONÔMETRO
 *    REGRESSIVO NATIVO na barra (conta segundo a segundo mesmo com o app
 *    morto) + trigger de conclusão que a substitui com som/vibração.
 * 2. expo-notifications (Expo Go, onde o módulo nativo do Notifee não
 *    existe): fixa com horário de término no texto + agendada de conclusão.
 *
 * A escolha é automática em runtime: se o require do Notifee encontrar o
 * módulo nativo, ele vence. Nenhuma outra parte do app precisa saber disso.
 */

// Mesmo identifier para as duas: a de fim SUBSTITUI a fixa na barra.
const REST_ID = 'rest-timer';
const CHANNEL_ID = 'rest-timer';

export interface RestNotificationTexts {
  ongoingTitle: string;
  ongoingBody: string;
  doneTitle: string;
  doneBody: string;
}

// ─── Backend 1: Notifee (cronômetro nativo) ─────────────────────────────────

type NotifeeModule = (typeof import('@notifee/react-native'))['default'];

let notifeeCache: NotifeeModule | null | undefined; // undefined = ainda não sondado
let usingNotifee = false;

function getNotifee(): NotifeeModule | null {
  if (notifeeCache !== undefined) return notifeeCache;
  try {
    // require dinâmico: no Expo Go o módulo nativo não existe e o import
    // estático quebraria o app inteiro; aqui só desativa este backend.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@notifee/react-native') as { default?: NotifeeModule };
    notifeeCache = mod.default ?? null;
  } catch {
    notifeeCache = null;
  }
  return notifeeCache;
}

async function notifeeStart(texts: RestNotificationTexts, seconds: number): Promise<boolean> {
  const notifee = getNotifee();
  if (!notifee) return false;
  try {
    await notifee.requestPermission();
    // Valores literais em vez dos enums do pacote para não precisar de import
    // estático (que avaliaria o módulo no Expo Go): 4 = AndroidImportance.HIGH,
    // 0 = TriggerType.TIMESTAMP.
    const channelId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Timer de descanso',
      importance: 4,
      vibration: true,
      sound: 'default',
    });
    const endMs = Date.now() + seconds * 1000;

    await notifee.displayNotification({
      id: REST_ID,
      title: texts.ongoingTitle,
      body: texts.ongoingBody,
      android: {
        channelId,
        ongoing: true,
        onlyAlertOnce: true,
        // Cronômetro regressivo nativo: a barra conta segundo a segundo até endMs.
        showTimestamp: true,
        timestamp: endMs,
        showChronometer: true,
        chronometerDirection: 'down',
        pressAction: { id: 'default' },
      },
    });

    await notifee.createTriggerNotification(
      {
        id: REST_ID,
        title: texts.doneTitle,
        body: texts.doneBody,
        android: { channelId, pressAction: { id: 'default' } },
      },
      { type: 0, timestamp: endMs } as Parameters<NotifeeModule['createTriggerNotification']>[1],
    );
    usingNotifee = true;
    return true;
  } catch {
    return false;
  }
}

async function notifeeCancel(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) return;
  try { await notifee.cancelTriggerNotification(REST_ID); } catch { /* já disparada */ }
  try { await notifee.cancelNotification(REST_ID); } catch { /* já dispensada */ }
}

// ─── Backend 2: expo-notifications (Expo Go) ────────────────────────────────

// Handler por tipo: a notificação FIXA (kind rest-live) deve entrar na barra
// mesmo com o app em foreground; a de FIM é suprimida em foreground (o banner
// in-app com vibração cobre) e só aparece quando termina em background.
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

let channelReady = false;
let permissionDenied = false;

async function expoEnsureReady(): Promise<boolean> {
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

async function expoStart(texts: RestNotificationTexts, seconds: number): Promise<void> {
  if (!(await expoEnsureReady())) return;

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
}

async function expoCancel(): Promise<void> {
  try { await Notifications.cancelScheduledNotificationAsync(REST_ID); } catch { /* já disparada */ }
  try { await Notifications.dismissNotificationAsync(REST_ID); } catch { /* já dispensada */ }
}

// ─── API pública ─────────────────────────────────────────────────────────────

/** Publica a fixa do descanso na barra e agenda a de conclusão. */
export async function startRestNotification(texts: RestNotificationTexts, seconds: number): Promise<void> {
  try {
    if (seconds < 1) return;
    if (await notifeeStart(texts, seconds)) return;
    await expoStart(texts, seconds);
  } catch {
    // notificação é acessória — nunca derruba o fluxo do treino
  }
}

/** Remove a fixa da barra e cancela a de fim (skip / novo descanso / concluiu no app). */
export async function cancelRestNotification(): Promise<void> {
  if (usingNotifee) {
    await notifeeCancel();
    return;
  }
  await expoCancel();
}
