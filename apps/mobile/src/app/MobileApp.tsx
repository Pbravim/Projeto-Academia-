import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { mobileDependencies } from '../bootstrap/mobileDependencies';
import { registerGlobalErrorHandler } from '../infrastructure/logging/registerGlobalErrorHandler';
import { ExerciseCatalogFeature } from '../ui/exercises/ExerciseCatalogFeature';
import { PesoFeature } from '../ui/peso/PesoFeature';
import { TreinoFeature } from '../ui/treinos/TreinoFeature';
import { SessaoFeature } from '../ui/sessao/SessaoFeature';
import { DashboardFeature } from '../ui/dashboard/DashboardFeature';
import { ThemeContext, useTheme, useThemePreference, useThemeProvider, type ThemePreference } from '../ui/shared/theme';

type ActiveModule = 'sessao' | 'exercicios' | 'treinos' | 'peso' | 'evolucao';

const THEME_OPTIONS: { value: ThemePreference; icon: string; label: string }[] = [
  { value: 'system', icon: '⊙', label: 'Auto' },
  { value: 'light',  icon: '☀', label: 'Claro' },
  { value: 'dark',   icon: '🌙', label: 'Escuro' },
];

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
  const insets = useSafeAreaInsets();
  const c = useTheme();

  useEffect(() => registerGlobalErrorHandler(mobileDependencies.logger), []);

  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <ThemeSegmentedControl />
      </View>

      <View style={styles.container}>
        {activeModule === 'sessao' ? (
          <SessaoFeature dependencies={mobileDependencies.sessao} />
        ) : activeModule === 'treinos' ? (
          <TreinoFeature dependencies={mobileDependencies.treinos} />
        ) : activeModule === 'exercicios' ? (
          <ExerciseCatalogFeature dependencies={mobileDependencies.exerciseCatalog} />
        ) : activeModule === 'peso' ? (
          <PesoFeature dependencies={mobileDependencies.peso} />
        ) : (
          <DashboardFeature dependencies={mobileDependencies.dashboard} />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        <TabButton label="Sessao"     active={activeModule === 'sessao'}     onPress={() => setActiveModule('sessao')} />
        <TabButton label="Treinos"    active={activeModule === 'treinos'}    onPress={() => setActiveModule('treinos')} />
        <TabButton label="Exercicios" active={activeModule === 'exercicios'} onPress={() => setActiveModule('exercicios')} />
        <TabButton label="Peso"       active={activeModule === 'peso'}       onPress={() => setActiveModule('peso')} />
        <TabButton label="Evolucao"   active={activeModule === 'evolucao'}   onPress={() => setActiveModule('evolucao')} />
      </View>
    </View>
  );
}

function ThemeSegmentedControl() {
  const c = useTheme();
  const { preference, setPreference } = useThemePreference();
  const styles = useMemo(() => makeSegmentedStyles(c), [c]);

  return (
    <View style={styles.track}>
      {THEME_OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setPreference(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed && !active ? styles.optionPressed : null,
            ]}
          >
            <Text style={styles.icon}>{opt.icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.tabBar },
    topBar: {
      backgroundColor: c.tabBar,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 4,
    },
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

function makeSegmentedStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: 2,
      gap: 1,
    },
    option: {
      width: 30,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    optionActive: {
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    optionPressed: { opacity: 0.5 },
    icon: { fontSize: 13 },
  });
}
