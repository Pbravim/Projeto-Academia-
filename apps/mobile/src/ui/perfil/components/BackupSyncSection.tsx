import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../shared/theme';
import { useBackupSync, type BackupSyncDependencies } from '../hooks/useBackupSync';

export function BackupSyncSection({ backup }: { backup: BackupSyncDependencies }) {
  const c = useTheme();
  const styles = makeStyles(c);
  const { authenticated, email: accountEmail, busy, status, login, register, logout, syncNow } =
    useBackupSync(backup);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    if (mode === 'login') void login(email, password);
    else void register(email, password, name);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Backup na nuvem</Text>

      {authenticated ? (
        <View style={styles.card}>
          <Text style={styles.connected}>Conectado como</Text>
          <Text style={styles.email}>{accountEmail}</Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable
            disabled={busy}
            onPress={() => { void syncNow(); }}
            style={({ pressed }) => [styles.primaryBtn, (pressed || busy) ? { opacity: 0.7 } : null]}
          >
            {busy ? <ActivityIndicator size="small" color={c.accentText} /> : <Text style={styles.primaryBtnText}>Sincronizar agora</Text>}
          </Pressable>
          <Pressable onPress={() => { void logout(); }} style={styles.linkBtn}>
            <Text style={styles.linkText}>Sair</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.help}>
            Entre para fazer backup e sincronizar seus treinos entre dispositivos. O app continua
            funcionando offline.
          </Text>
          {mode === 'register' ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nome (opcional)"
              placeholderTextColor={c.inputPlaceholder}
              editable={!busy}
            />
          ) : null}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={c.inputPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Senha"
            placeholderTextColor={c.inputPlaceholder}
            secureTextEntry
            editable={!busy}
          />
          {status ? <Text style={styles.error}>{status}</Text> : null}
          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [styles.primaryBtn, (!canSubmit || pressed) ? { opacity: 0.7 } : null]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={c.accentText} />
            ) : (
              <Text style={styles.primaryBtnText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.linkBtn}>
            <Text style={styles.linkText}>
              {mode === 'login' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    section: { marginTop: 8 },
    label: {
      fontSize: 13, fontWeight: '700', color: c.textLabel,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
    },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder,
      padding: 16, gap: 10,
    },
    help: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    connected: { fontSize: 12, color: c.textMeta },
    email: { fontSize: 16, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
    status: { fontSize: 13, color: c.textSecondary },
    error: { fontSize: 13, color: c.error },
    input: {
      backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.inputText, fontSize: 15,
    },
    primaryBtn: {
      backgroundColor: c.accent, borderRadius: 12, paddingVertical: 13,
      alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    primaryBtnText: { color: c.accentText, fontWeight: '700', fontSize: 15 },
    linkBtn: { alignItems: 'center', paddingVertical: 6 },
    linkText: { color: c.accent, fontSize: 13, fontWeight: '600' },
  });
}
