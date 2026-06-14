import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Storage } from 'expo-sqlite/kv-store';

import { mobileDependencies } from '../bootstrap/mobileDependencies';
import { registerGlobalErrorHandler } from '../infrastructure/logging/registerGlobalErrorHandler';
import { ExerciseCatalogFeature } from '../ui/exercises/ExerciseCatalogFeature';
import { PerfilFeature } from '../ui/perfil/PerfilFeature';
import { PERFIL_NOME_KEY, PERFIL_FOTO_KEY } from '../ui/perfil/hooks/usePerfilController';
import { TreinoFeature } from '../ui/treinos/TreinoFeature';
import { SessaoFeature } from '../ui/sessao/SessaoFeature';
import { DashboardFeature } from '../ui/dashboard/DashboardFeature';
import { ThemeContext, useTheme, useThemeProvider } from '../ui/shared/theme';

type ActiveModule = 'sessao' | 'exercicios' | 'treinos' | 'evolucao' | 'perfil';
type TabModule = Exclude<ActiveModule, 'perfil'>;

const PERFIL_DEPS = {
  peso: mobileDependencies.peso,
  getDashboardStats: mobileDependencies.dashboard.getDashboardStats,
  exportarHistorico: mobileDependencies.dashboard.exportarHistorico,
  exportarBanco: mobileDependencies.dashboard.exportarBanco,
  importarBanco: mobileDependencies.dashboard.importarBanco,
  resetHistorico: mobileDependencies.dashboard.resetHistorico,
  logger: mobileDependencies.logger,
  backup: mobileDependencies.backup,
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

export function MobileApp() {
  const themeValue = useThemeProvider();
  return (
    <ThemeContext.Provider value={themeValue}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

function AppContent() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('sessao');
  const [displayName, setDisplayName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const lastTabRef = useRef<TabModule>('sessao');
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  useEffect(() => registerGlobalErrorHandler(mobileDependencies.logger), []);

  useEffect(() => { void mobileDependencies.baixarTodasMidias.execute(); }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeModule === 'perfil') {
        setActiveModule(lastTabRef.current);
        return true;
      }
      // Consume the event at tab root so Expo Go doesn't intercept it.
      // Returning true here prevents the Expo launcher from appearing;
      // the OS default (minimize app) is triggered only when nothing consumes it,
      // which in a standalone/dev-client build would just minimize the app.
      return true;
    });
    return () => sub.remove();
  }, [activeModule]);

  useEffect(() => {
    void Promise.all([
      Storage.getItem(PERFIL_NOME_KEY),
      Storage.getItem(PERFIL_FOTO_KEY),
    ]).then(([nome, foto]) => {
      if (nome) setDisplayName(nome);
      if (foto) setPhotoUri(foto);
    });
  }, []);

  const handleTabPress = (tab: TabModule) => {
    lastTabRef.current = tab;
    setActiveModule(tab);
  };

  const handleProfilePress = () => {
    if (activeModule === 'perfil') {
      setActiveModule(lastTabRef.current);
    } else {
      setActiveModule('perfil');
    }
  };

  const profileOpen = activeModule === 'perfil';
  const initials = getInitials(displayName);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLabel}>Bem vindo{displayName ? ',' : ''}</Text>
          {displayName ? (
            <Text style={styles.greetingName} numberOfLines={1}>{displayName}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleProfilePress}
          style={({ pressed }) => [
            styles.profileButton,
            profileOpen ? styles.profileButtonActive : null,
            pressed ? styles.profileButtonPressed : null,
          ]}
          accessibilityLabel="Perfil"
          accessibilityRole="button"
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
          ) : (
            <Text style={[styles.profileInitials, profileOpen ? styles.profileInitialsActive : null]}>
              {initials}
            </Text>
          )}
        </Pressable>
      </View>

      {/* ── Content ── */}
      <View style={styles.container}>
        {activeModule === 'sessao' ? (
          <SessaoFeature
            dependencies={mobileDependencies.sessao}
            onGoToTreinos={() => handleTabPress('treinos')}
          />
        ) : activeModule === 'treinos' ? (
          <TreinoFeature
            dependencies={{
              list: mobileDependencies.treinos.list,
              detail: mobileDependencies.treinos.detail,
              plano: mobileDependencies.treinos.plano,
            }}
            onGoToSessao={() => handleTabPress('sessao')}
          />
        ) : activeModule === 'exercicios' ? (
          <ExerciseCatalogFeature dependencies={mobileDependencies.exerciseCatalog} />
        ) : activeModule === 'evolucao' ? (
          <DashboardFeature
            dependencies={mobileDependencies.dashboard}
            onGoToSessao={() => handleTabPress('sessao')}
          />
        ) : (
          <PerfilFeature
            dependencies={PERFIL_DEPS}
            onNameChange={setDisplayName}
            onPhotoChange={setPhotoUri}
          />
        )}
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        <TabButton label="Sessao"     active={activeModule === 'sessao'}     onPress={() => handleTabPress('sessao')} />
        <TabButton label="Treinos"    active={activeModule === 'treinos'}    onPress={() => handleTabPress('treinos')} />
        <TabButton label="Exercicios" active={activeModule === 'exercicios'} onPress={() => handleTabPress('exercicios')} />
        <TabButton label="Evolucao"   active={activeModule === 'evolucao'}   onPress={() => handleTabPress('evolucao')} />
      </View>
    </View>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
        active ? { backgroundColor: c.tabActive } : null,
      ]}
    >
      <Text style={{ color: active ? c.tabTextActive : c.tabText, fontSize: 13, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.tabBar },

    topBar: {
      backgroundColor: c.tabBar,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    greetingBlock: { flex: 1, gap: 1 },
    greetingLabel: {
      color: c.tabText,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    greetingName: {
      color: c.tabTextActive,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
      marginLeft: 12,
    },
    profileButtonActive: {
      backgroundColor: c.accent,
      borderColor: c.tabTextActive,
    },
    profileButtonPressed: { opacity: 0.65 },
    profilePhoto: { width: 44, height: 44 },
    profileInitials: { color: c.tabText, fontSize: 16, fontWeight: '800' },
    profileInitialsActive: { color: c.accentText },

    container: { flex: 1, backgroundColor: c.background },

    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.tabBar,
      paddingHorizontal: 12,
      paddingTop: 6,
      gap: 2,
    },
  });
}
