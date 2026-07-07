import { useMemo } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { File } from 'expo-file-system';

import { isYouTubeUrl } from '../../../application/exercises/use-cases/BaixarMidiaExercicioUseCase';
import { useTheme } from '../../shared/theme';
import { useT } from '../../shared/i18n';
import { gifAssets } from './gifAssets';

interface Props {
  visible: boolean;
  exercicioNome: string;
  mediaOnline: string | null;
  mediaLocal: string | null;
  onClose: () => void;
}

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function isImageUri(uri: string): boolean {
  const lower = uri.split('?')[0]!.toLowerCase();
  return lower.endsWith('.gif') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

function VideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; void p.play(); });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 280 }}
      contentFit="contain"
      nativeControls
    />
  );
}

export function ExerciseMediaViewer({ visible, exercicioNome, mediaOnline, mediaLocal, onClose }: Props) {
  const c = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!visible) return null;

  // Ponteiro local quebrado (arquivo tmp_ limpo pelo SO ou download antigo com
  // nome errado) não pode deixar o viewer em branco: cai para a URL online.
  const localOk = mediaLocal != null && (!mediaLocal.startsWith('file://') || fileExists(mediaLocal));
  const activeUri = (localOk ? mediaLocal : null) ?? mediaOnline;
  const isYT = activeUri ? isYouTubeUrl(activeUri) : false;
  const isImage = activeUri && !isYT ? isImageUri(activeUri) : false;

  const handleOpenYouTube = () => {
    if (mediaOnline) void Linking.openURL(mediaOnline);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{exercicioNome}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {activeUri && !isYT ? (
            isImage ? (
              <Image
                source={
                  activeUri && !activeUri.startsWith('file://') && !activeUri.startsWith('http')
                    ? (gifAssets[activeUri] ?? { uri: activeUri })
                    : { uri: activeUri! }
                }
                style={styles.image}
                contentFit="contain"
                transition={150}
              />
            ) : (
              <VideoPlayer uri={activeUri} />
            )
          ) : isYT ? (
            <View style={styles.youtubeBlock}>
              <Text style={styles.youtubeText}>{t('exercises.mediaViewer.youtubeText')}</Text>
              <Pressable
                onPress={handleOpenYouTube}
                style={({ pressed }) => [styles.youtubeBtn, pressed ? { opacity: 0.8 } : null]}
              >
                <Text style={styles.youtubeBtnText}>{t('exercises.mediaViewer.abrirYoutube')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>{t('exercises.mediaViewer.emptyText')}</Text>
            </View>
          )}

          {mediaLocal ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('exercises.mediaViewer.savedOffline')}</Text>
            </View>
          ) : mediaOnline && !isYT ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('exercises.mediaViewer.online')}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: { width: '100%', backgroundColor: c.card, borderRadius: 20, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    title: { flex: 1, color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    closeBtn: { padding: 4 },
    closeText: { color: c.textSecondary, fontSize: 18, fontWeight: '700' },
    image: { width: '100%', height: 280, backgroundColor: c.cardAlt },
    youtubeBlock: { padding: 32, alignItems: 'center', gap: 16 },
    youtubeText: { color: c.textSecondary, fontSize: 14 },
    youtubeBtn: { backgroundColor: '#FF0000', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    youtubeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    emptyBlock: { padding: 40, alignItems: 'center' },
    emptyText: { color: c.textSecondary, fontSize: 14 },
    badge: { paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
    badgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  });
}
