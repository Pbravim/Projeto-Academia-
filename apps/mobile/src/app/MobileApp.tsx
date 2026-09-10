import { Ionicons } from '@expo/vector-icons';
import { Storage } from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileDependencies } from '../bootstrap/mobileDependencies';
import { registerGlobalErrorHandler } from '../infrastructure/logging/registerGlobalErrorHandler';
import { DashboardFeature } from '../ui/dashboard/DashboardFeature';
import { ExerciseCatalogFeature } from '../ui/exercises/ExerciseCatalogFeature';
import { PERFIL_FOTO_KEY,PERFIL_NOME_KEY } from '../ui/perfil/hooks/usePerfilController';
import { PerfilFeature } from '../ui/perfil/PerfilFeature';
import { SessaoFeature } from '../ui/sessao/SessaoFeature';
import { LocaleProvider, useT } from '../ui/shared/i18n';
import { TabActivityContext } from '../ui/shared/tabActivity';
import { ThemeContext, useTheme, useThemeProvider } from '../ui/shared/theme';
import { TreinoFeature } from '../ui/treinos/TreinoFeature';

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
      <LocaleProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </LocaleProvider>
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
  const t = useT();
  const styles = useMemo(() => makeStyles(c), [c]);

  useEffect(() => registerGlobalErrorHandler(mobileDependencies.logger), []);

  // Adiado: no boot compete com o primeiro render + seeding pela conexão SQLite.
  useEffect(() => {
    const timer = setTimeout(() => { void mobileDependencies.baixarTodasMidias.execute(); }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  // Registrado UMA vez no mount: BackHandler é LIFO, então este handler fica no
  // FUNDO da pilha e subtelas registradas depois têm prioridade. Re-registrar a
  // cada troca de aba o colocava no topo e engolia o back das subtelas.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeModuleRef.current === 'perfil') {
        setActiveModule(lastTabRef.current);
        return true;
      }
      // Em DEV (Expo Go) consumimos o evento para o launcher não aparecer.
      // Em produção deixamos o SO agir: back no tab root minimiza o app —
      // consumir sempre deixava o usuário "preso" sem conseguir minimizar.
      return __DEV__;
    });
    return () => sub.remove();
  }, []);

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

  // Keep-alive: cada aba monta na primeira visita e fica montada (oculta via
  // display:none). Antes, trocar de aba DESMONTAVA a feature — perdia estado
  // (timer de descanso, inputs digitados) e re-executava todas as queries de
  // mount ao voltar.
  const [mountedModules, setMountedModules] = useState<Set<ActiveModule>>(() => new Set(['sessao']));
  useEffect(() => {
    setMountedModules((prev) => (prev.has(activeModule) ? prev : new Set(prev).add(activeModule)));
  }, [activeModule]);

  const tabPage = (mod: ActiveModule, element: React.ReactNode) =>
    mountedModules.has(mod) ? (
      <View style={[styles.tabPage, activeModule !== mod ? styles.tabPageHidden : null]}>
        <TabActivityContext.Provider value={activeModule === mod}>{element}</TabActivityContext.Provider>
      </View>
    ) : null;

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
          <Text style={styles.greetingLabel}>{t('shell.greeting')}{displayName ? ',' : ''}</Text>
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
          accessibilityLabel={t('shell.profileLabel')}
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
        {tabPage('sessao', (
          <SessaoFeature
            dependencies={mobileDependencies.sessao}
            onGoToTreinos={() => handleTabPress('treinos')}
          />
        ))}
        {tabPage('treinos', (
          <TreinoFeature
            dependencies={{
              list: mobileDependencies.treinos.list,
              detail: mobileDependencies.treinos.detail,
              plano: mobileDependencies.treinos.plano,
            }}
            onGoToSessao={() => handleTabPress('sessao')}
          />
        ))}
        {tabPage('exercicios', (
          <ExerciseCatalogFeature dependencies={mobileDependencies.exerciseCatalog} />
        ))}
        {tabPage('evolucao', (
          <DashboardFeature
            dependencies={mobileDependencies.dashboard}
            onGoToSessao={() => handleTabPress('sessao')}
          />
        ))}
        {tabPage('perfil', (
          <PerfilFeature
            dependencies={PERFIL_DEPS}
            onNameChange={setDisplayName}
            onPhotoChange={setPhotoUri}
          />
        ))}
      </View>

      {/* ── Bottom tab bar ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        <TabButton label={t('tabs.sessao')}     icon="barbell"   active={activeModule === 'sessao'}     onPress={() => handleTabPress('sessao')} />
        <TabButton label={t('tabs.treinos')}    icon="clipboard" active={activeModule === 'treinos'}    onPress={() => handleTabPress('treinos')} />
        <TabButton label={t('tabs.exercicios')} icon="fitness"   active={activeModule === 'exercicios'} onPress={() => handleTabPress('exercicios')} />
        <TabButton label={t('tabs.evolucao')}   icon="stats-chart" active={activeModule === 'evolucao'} onPress={() => handleTabPress('evolucao')} />
      </View>
    </View>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  const c = useTheme();
  const color = active ? c.tabTextActive : c.tabText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
      style={[
        { flex: 1, paddingVertical: 8, borderRadius: 14, alignItems: 'center', gap: 3 },
        active ? { backgroundColor: c.tabActive } : null,
      ]}
    >
      <Ionicons name={active ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)} size={22} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 }}>
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
    tabPage: { flex: 1 },
    tabPageHidden: { display: 'none' },

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
