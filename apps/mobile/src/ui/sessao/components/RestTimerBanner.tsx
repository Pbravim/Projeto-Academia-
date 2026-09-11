import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { useT } from '../../shared/i18n';
import { useTheme } from '../../shared/theme';
import { cancelRestNotification, startRestNotification } from '../restTimerNotification';

interface Props {
  nome: string;
  /** Duração total do descanso em segundos. */
  total: number;
  /** Muda a cada novo descanso — reinicia a contagem mesmo com o mesmo total. */
  runId: number;
  minimized: boolean;
  onToggleMinimized: () => void;
  onSkip: () => void;
  /** Chamado quando a contagem chega a zero (o pai esconde o banner). */
  onDone: () => void;
}

/**
 * O countdown vive AQUI, não no ecrã: um tick por segundo no componente-pai
 * (1400+ linhas) re-renderizava a tela inteira durante todo o descanso.
 */
export function RestTimerBanner({ nome, total, runId, minimized, onToggleMinimized, onSkip, onDone }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [restante, setRestante] = useState(total);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    // Contagem por relógio de parede, não por ticks: o setInterval congela em
    // background/tela bloqueada — ancorar em `endsAt` faz o tempo fora do app
    // contar; ao voltar ao foreground o restante real é recalculado na hora.
    const endsAt = Date.now() + total * 1000;
    const compute = () =>
      setRestante(Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0));
    compute();
    const interval = setInterval(compute, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') compute();
    });

    // Notificação FIXA na barra durante o descanso + a de conclusão agendada
    // que a substitui no fim (som/vibração do sistema mesmo em background).
    // Skip/novo descanso/fim limpam a barra via cleanup.
    const hora = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    void startRestNotification(
      {
        ongoingTitle: t('sessao.timer.ongoingTitle'),
        ongoingBody: t('sessao.timer.ongoingBody', { nome, hora }),
        doneTitle: t('sessao.timer.notifTitle'),
        doneBody: t('sessao.timer.notifBody', { nome }),
      },
      total,
    );

    return () => {
      clearInterval(interval);
      sub.remove();
      void cancelRestNotification();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t/nome só afetam o texto da notificação
  }, [total, runId]);

  useEffect(() => {
    if (restante === 0 && total > 0) {
      Vibration.vibrate([0, 400, 100, 400]);
      onDoneRef.current();
    }
  }, [restante, total]);

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const label = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  const progress = total > 0 ? restante / total : 0;

  if (minimized) {
    return (
      <Pressable onPress={onToggleMinimized} style={styles.pill}>
        <Text style={styles.pillText}>⏱ {label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.eyebrow}>{t('sessao.common.descanso')}</Text>
          <Text style={styles.exercicioLabel} numberOfLines={1}>{nome}</Text>
        </View>
        <Pressable onPress={onToggleMinimized} style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.6 } : null]}>
          <Text style={styles.iconBtnText}>−</Text>
        </Pressable>
      </View>

      <Text style={styles.countdown}>{label}</Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      <Pressable onPress={onSkip} style={({ pressed }) => [styles.skipBtn, pressed ? { opacity: 0.8 } : null]}>
        <Text style={styles.skipBtnText}>{t('sessao.timer.pular')}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // Minimised pill — bottom-right corner
    pill: {
      position: 'absolute',
      bottom: 32,
      right: 20,
      backgroundColor: c.accent,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    pillText: { color: c.accentText, fontSize: 15, fontWeight: '800' },

    // Expanded card — bottom of screen
    card: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      backgroundColor: c.accent,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    eyebrow: { color: c.accentText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.75 },
    exercicioLabel: { color: c.accentText, fontSize: 14, fontWeight: '700', marginTop: 2, maxWidth: 220 },
    iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    iconBtnText: { color: c.accentText, fontSize: 20, fontWeight: '300', lineHeight: 22 },
    countdown: { color: c.accentText, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
    barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
    barFill: { height: 5, borderRadius: 3, backgroundColor: c.accentText },
    skipBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    skipBtnText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });
}
