import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { mobileDependencies } from '../bootstrap/mobileDependencies';
import { registerGlobalErrorHandler } from '../infrastructure/logging/registerGlobalErrorHandler';
import { ExerciseCatalogFeature } from '../ui/exercises/ExerciseCatalogFeature';
import { PesoFeature } from '../ui/peso/PesoFeature';
import { TreinoFeature } from '../ui/treinos/TreinoFeature';
import { SessaoFeature } from '../ui/sessao/SessaoFeature';

type ActiveModule = 'sessao' | 'exercicios' | 'treinos' | 'peso';

export function MobileApp() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('sessao');

  useEffect(() => registerGlobalErrorHandler(mobileDependencies.logger), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.tabBar}>
        <TabButton label="Sessao" active={activeModule === 'sessao'} onPress={() => setActiveModule('sessao')} />
        <TabButton label="Treinos" active={activeModule === 'treinos'} onPress={() => setActiveModule('treinos')} />
        <TabButton label="Exercicios" active={activeModule === 'exercicios'} onPress={() => setActiveModule('exercicios')} />
        <TabButton label="Peso" active={activeModule === 'peso'} onPress={() => setActiveModule('peso')} />
      </View>

      <View style={styles.container}>
        {activeModule === 'sessao' ? (
          <SessaoFeature dependencies={mobileDependencies.sessao} />
        ) : activeModule === 'treinos' ? (
          <TreinoFeature dependencies={mobileDependencies.treinos} />
        ) : activeModule === 'exercicios' ? (
          <ExerciseCatalogFeature dependencies={mobileDependencies.exerciseCatalog} />
        ) : (
          <PesoFeature dependencies={mobileDependencies.peso} />
        )}
      </View>
    </SafeAreaView>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active ? styles.tabActive : null]}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#20352c' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#20352c',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#c96f2d',
  },
  tabText: {
    color: '#b8c9a9',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff8f2',
  },
  container: { flex: 1, backgroundColor: '#f3f0e8' },
});
